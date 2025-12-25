import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import io from "socket.io-client";
import { Send, Users, MessageCircle } from "lucide-react";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const recipientEmail = searchParams.get("to");

  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [chatMode, setChatMode] = useState(
    recipientEmail ? "direct" : "community"
  );
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [directConversations, setDirectConversations] = useState([]);
  const messagesEndRef = useRef(null);

  const { user: reduxUser, token } = useSelector((state) => state.auth);
  const { user: clerkUser } = useUser();
  const { theme } = useSelector((state) => state.theme);

  // Get user email from either Clerk or Redux
  const userEmail =
    clerkUser?.primaryEmailAddress?.emailAddress || reduxUser?.email;
  const userName =
    clerkUser?.fullName ||
    `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim() ||
    reduxUser?.firstName ||
    "User";

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  // Initialize direct message if recipient is specified
  useEffect(() => {
    if (recipientEmail) {
      setChatMode("direct");
      setRecipientInfo({ email: recipientEmail, name: "Instructor" });
      setMessages([]);

      // Add to conversations if not already there
      setDirectConversations((prev) => {
        const exists = prev.find((conv) => conv.email === recipientEmail);
        if (!exists) {
          return [
            {
              email: recipientEmail,
              name: "Instructor",
              lastMessage: "Start conversation",
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ];
        }
        return prev;
      });
    }
  }, [recipientEmail]);

  // Initialize Socket.io connection
  useEffect(() => {
    const socketUrl =
      process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
    const newSocket = io(socketUrl, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
      // Register user for direct messages
      if (userEmail) {
        newSocket.emit("register_user", userEmail);
        console.log("User registered for direct messages:", userEmail);
      }
    });

    newSocket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on("receive_direct_message", (data) => {
      console.log("Received direct message:", data);
      setMessages((prev) => [...prev, data]);

      // Update conversations list with new message
      setDirectConversations((prev) => {
        const existingIndex = prev.findIndex(
          (conv) => conv.email === data.from || conv.email === data.sender
        );
        const conversationEmail = data.from || data.sender;
        const conversationName =
          data.fromName || data.senderName || conversationEmail;

        if (existingIndex >= 0) {
          // Move to top with new message
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: data.message || data.content,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          return [
            updated[existingIndex],
            ...updated.slice(0, existingIndex),
            ...updated.slice(existingIndex + 1),
          ];
        } else {
          // Add new conversation
          return [
            {
              email: conversationEmail,
              name: conversationName,
              lastMessage: data.message || data.content,
              timestamp: data.timestamp || new Date().toISOString(),
            },
            ...prev,
          ];
        }
      });
    });

    newSocket.on("new_message_notification", (data) => {
      console.log("New message notification:", data);

      // Show browser notification if permission granted
      if (Notification.permission === "granted") {
        new Notification(`New message from ${data.fromName}`, {
          body: data.message,
          icon: "/favicon.ico",
          tag: "chat-notification",
        });
      }

      // Play notification sound (optional)
      try {
        const audio = new Audio("/notification.mp3");
        audio.play().catch((e) => console.log("Audio play failed:", e));
      } catch (e) {
        console.log("Audio not available");
      }
    });

    newSocket.on("user_joined", (data) => {
      setOnlineUsers((prev) => [...prev, data.username]);
    });

    newSocket.on("user_left", (data) => {
      setOnlineUsers((prev) => prev.filter((u) => u !== data.username));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, userEmail]);

  // Fetch user's communities
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/community`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setCommunities(response.data.communities || []);
      } catch (error) {
        console.error("Error fetching communities:", error);
      }
    };

    if (token) {
      fetchCommunities();
    }
  }, [token]);

  // Load messages when community is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedCommunity) return;

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/chat/messages/${selectedCommunity._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages(response.data.messages || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    // Join room
    if (socket && selectedCommunity) {
      socket.emit("join_room", {
        room: selectedCommunity._id,
        username: userName,
      });
    }
  }, [selectedCommunity, socket, token, userName]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const activeRecipient = recipientInfo?.email || recipientEmail;

    if (chatMode === "direct" && activeRecipient) {
      // Direct message mode
      const messageData = {
        type: "direct",
        to: activeRecipient,
        message: messageInput,
        sender: userEmail,
        senderName: userName,
        timestamp: new Date().toISOString(),
      };

      // Add to local messages immediately
      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now(),
          sender: { name: messageData.senderName },
          content: messageInput,
          createdAt: new Date(),
        },
      ]);

      // Update conversations list
      setDirectConversations((prev) => {
        const existingIndex = prev.findIndex(
          (conv) => conv.email === activeRecipient
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: messageInput,
            timestamp: new Date().toISOString(),
          };
          return [
            updated[existingIndex],
            ...updated.slice(0, existingIndex),
            ...updated.slice(existingIndex + 1),
          ];
        }
        return prev;
      });

      // Emit to socket
      if (socket) {
        socket.emit("send_direct_message", messageData);
      }

      setMessageInput("");
    } else if (selectedCommunity && socket) {
      // Community message mode
      const messageData = {
        type: "community",
        room: selectedCommunity._id,
        message: messageInput,
        sender: reduxUser?._id || reduxUser?.id,
        senderName: userName,
        timestamp: new Date().toISOString(),
      };

      // Emit to socket
      socket.emit("send_message", messageData);

      // Save to database
      try {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/chat/message`,
          {
            community: selectedCommunity._id,
            message: messageInput,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessageInput("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  return (
    <div
      className={`ml-64 p-6 min-h-screen ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <h1
          className={`text-3xl font-bold mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          <MessageCircle className="inline-block mr-2 mb-1" size={32} />
          {chatMode === "direct" ? "Direct Message" : "Community Chat"}
        </h1>

        {/* Direct message info banner */}
        {chatMode === "direct" && recipientInfo && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              theme === "dark"
                ? "bg-blue-900/30 text-blue-300 border border-blue-800"
                : "bg-blue-100 text-blue-800 border border-blue-300"
            }`}
          >
            <p className="font-semibold">
              Direct conversation with: {recipientInfo.email}
            </p>
            <p className="text-sm mt-1">
              Send messages in real-time to the course instructor
            </p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar with tabs */}
          <div
            className={`col-span-3 rounded-lg shadow-soft overflow-hidden ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-100"
            } border`}
          >
            {/* Tab buttons */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => {
                  setChatMode("community");
                  setRecipientInfo(null);
                }}
                className={`flex-1 py-3 px-4 font-medium text-sm transition ${
                  chatMode === "community"
                    ? theme === "dark"
                      ? "bg-blue-900 text-white border-b-2 border-blue-500"
                      : "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                    : theme === "dark"
                    ? "text-gray-400 hover:bg-gray-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Communities
              </button>
              <button
                onClick={() => {
                  setChatMode("direct");
                  setSelectedCommunity(null);
                }}
                className={`flex-1 py-3 px-4 font-medium text-sm transition ${
                  chatMode === "direct"
                    ? theme === "dark"
                      ? "bg-blue-900 text-white border-b-2 border-blue-500"
                      : "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                    : theme === "dark"
                    ? "text-gray-400 hover:bg-gray-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Messages
              </button>
            </div>

            {/* Content based on mode */}
            <div className="p-4 overflow-y-auto h-[calc(100%-49px)]">
              {chatMode === "community" ? (
                <>
                  <h2
                    className={`text-lg font-semibold mb-4 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Your Communities
                  </h2>
                  {communities.length === 0 ? (
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Join a community to start chatting
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {communities.map((community) => (
                        <button
                          key={community._id}
                          onClick={() => setSelectedCommunity(community)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            selectedCommunity?._id === community._id
                              ? theme === "dark"
                                ? "bg-blue-900 text-white"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                              : theme === "dark"
                              ? "text-gray-300 hover:bg-gray-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="font-medium truncate">
                            {community.name}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              selectedCommunity?._id === community._id
                                ? theme === "dark"
                                  ? "text-blue-200"
                                  : "text-blue-600"
                                : theme === "dark"
                                ? "text-gray-500"
                                : "text-gray-500"
                            }`}
                          >
                            {community.members?.length || 0} members
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2
                    className={`text-lg font-semibold mb-4 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Direct Messages
                  </h2>
                  {directConversations.length === 0 ? (
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      No conversations yet. Click "Message" on a course
                      instructor's profile to start chatting.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {directConversations.map((conv, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setChatMode("direct");
                            setRecipientInfo(conv);
                            setSelectedCommunity(null);
                            setMessages([]);
                          }}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            recipientInfo?.email === conv.email
                              ? theme === "dark"
                                ? "bg-blue-900 text-white"
                                : "bg-blue-50 text-blue-700"
                              : theme === "dark"
                              ? "text-gray-300 hover:bg-gray-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="font-medium truncate">
                            {conv.name}
                          </div>
                          <div
                            className={`text-xs mt-1 truncate ${
                              recipientInfo?.email === conv.email
                                ? theme === "dark"
                                  ? "text-blue-200"
                                  : "text-blue-600"
                                : theme === "dark"
                                ? "text-gray-500"
                                : "text-gray-500"
                            }`}
                          >
                            {conv.lastMessage}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {conv.timestamp
                              ? new Date(conv.timestamp).toLocaleDateString()
                              : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div
            className={`col-span-9 rounded-lg shadow-soft flex flex-col ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-100"
            } border`}
          >
            {selectedCommunity ||
            (chatMode === "direct" && (recipientInfo || recipientEmail)) ? (
              <>
                {/* Chat Header */}
                <div
                  className={`p-4 border-b flex justify-between items-center ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {chatMode === "direct"
                        ? `Direct Message - ${
                            recipientInfo?.name ||
                            recipientInfo?.email ||
                            recipientEmail ||
                            "Instructor"
                          }`
                        : selectedCommunity?.name || "Chat"}
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {chatMode === "direct"
                        ? "Send messages in real-time"
                        : selectedCommunity?.description || ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users
                      size={18}
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    />
                    <span
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {onlineUsers.length} online
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div
                      className={`text-center py-12 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      <MessageCircle
                        size={48}
                        className="mx-auto mb-3 opacity-50"
                      />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      // Handle both direct and community message formats
                      const messageText = msg.message || msg.content || "";
                      const senderName =
                        msg.senderName ||
                        msg.sender?.name ||
                        (msg.sender?.firstName
                          ? `${msg.sender.firstName} ${
                              msg.sender.lastName || ""
                            }`
                          : "User");
                      const timestamp = msg.timestamp || msg.createdAt;
                      const isOwnMessage =
                        msg.sender === userEmail ||
                        msg.senderEmail === userEmail ||
                        msg.sender === reduxUser?._id ||
                        msg.sender === reduxUser?.id ||
                        msg.sender?.email === userEmail;

                      return (
                        <div
                          key={index}
                          className={`flex ${
                            isOwnMessage ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-md px-4 py-2 rounded-lg ${
                              isOwnMessage
                                ? "bg-blue-600 text-white"
                                : theme === "dark"
                                ? "bg-gray-700 text-gray-100"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <div className="text-xs font-semibold mb-1 opacity-75">
                              {senderName}
                            </div>
                            <div className="break-words">{messageText}</div>
                            <div className="text-xs mt-1 opacity-60">
                              {timestamp
                                ? new Date(timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className={`p-4 border-t ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type your message..."
                      className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Send size={18} />
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div
                className={`flex-1 flex items-center justify-center ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <div className="text-center">
                  <MessageCircle
                    size={64}
                    className="mx-auto mb-4 opacity-30"
                  />
                  <p className="text-lg">
                    Select a community to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
