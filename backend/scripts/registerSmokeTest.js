const { server } = require("../src/server");

const run = async () => {
  const email = `cors-test-${Date.now()}@example.com`;
  const payload = {
    firstName: "Cors",
    lastName: "Tester",
    email,
    password: "Password123!",
  };

  try {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3001",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);

    if (!res.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Request failed", error);
    process.exitCode = 1;
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
};

run();
