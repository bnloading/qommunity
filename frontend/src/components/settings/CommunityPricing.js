import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { DollarSign, Save, AlertCircle, Check, Info } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CURRENCIES = [
  { code: "usd", symbol: "$", name: "US Dollar" },
  { code: "eur", symbol: "€", name: "Euro" },
  { code: "gbp", symbol: "£", name: "British Pound" },
  { code: "cad", symbol: "C$", name: "Canadian Dollar" },
  { code: "aud", symbol: "A$", name: "Australian Dollar" },
];

const CommunityPricing = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [pricing, setPricing] = useState({
    pricingModel: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "usd",
    hasTrial: false,
    trialDays: 7,
  });

  const fetchPricing = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/pricing`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPricing(res.data.pricing);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Convert dollars to cents
      const monthlyPriceCents = Math.round(
        parseFloat(pricing.monthlyPrice || 0) * 100
      );
      const yearlyPriceCents = Math.round(
        parseFloat(pricing.yearlyPrice || 0) * 100
      );

      const token = await getToken();
      await axios.put(
        `${API_URL}/community-settings/${communityId}/pricing`,
        {
          pricingModel: pricing.pricingModel,
          monthlyPrice: monthlyPriceCents,
          yearlyPrice: yearlyPriceCents,
          currency: pricing.currency,
          hasTrial: pricing.hasTrial,
          trialDays: pricing.trialDays,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Pricing updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const getCurrencySymbol = () => {
    return CURRENCIES.find((c) => c.code === pricing.currency)?.symbol || "$";
  };

  // Calculate yearly savings
  const yearlySavings = () => {
    const monthly = parseFloat(pricing.monthlyPrice) || 0;
    const yearly = parseFloat(pricing.yearlyPrice) || 0;
    if (monthly > 0 && yearly > 0) {
      const savings = ((monthly * 12 - yearly) / (monthly * 12)) * 100;
      return savings.toFixed(0);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Convert cents to dollars for display
  const monthlyDisplay =
    pricing.monthlyPrice > 100
      ? (pricing.monthlyPrice / 100).toFixed(2)
      : pricing.monthlyPrice;
  const yearlyDisplay =
    pricing.yearlyPrice > 100
      ? (pricing.yearlyPrice / 100).toFixed(2)
      : pricing.yearlyPrice;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pricing
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Configure subscription pricing for your community
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 space-y-6">
        {/* Pricing Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Pricing Model
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setPricing({ ...pricing, pricingModel: "free" })}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                pricing.pricingModel === "free"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Free
                </span>
              </div>
              <p className="text-sm text-gray-500">Anyone can join for free</p>
            </button>

            <button
              onClick={() =>
                setPricing({ ...pricing, pricingModel: "subscription" })
              }
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                pricing.pricingModel === "subscription"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Paid Subscription
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Members pay monthly or yearly
              </p>
            </button>
          </div>
        </div>

        {/* Paid Settings */}
        {pricing.pricingModel === "subscription" && (
          <>
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={pricing.currency}
                onChange={(e) =>
                  setPricing({ ...pricing, currency: e.target.value })
                }
                className="w-full md:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {getCurrencySymbol()}
                  </span>
                  <input
                    type="number"
                    value={monthlyDisplay}
                    onChange={(e) =>
                      setPricing({ ...pricing, monthlyPrice: e.target.value })
                    }
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Per month</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Yearly Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {getCurrencySymbol()}
                  </span>
                  <input
                    type="number"
                    value={yearlyDisplay}
                    onChange={(e) =>
                      setPricing({ ...pricing, yearlyPrice: e.target.value })
                    }
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Per year{" "}
                  {yearlySavings() > 0 && `(${yearlySavings()}% savings)`}
                </p>
              </div>
            </div>

            {/* Trial */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Free Trial
                  </h4>
                  <p className="text-sm text-gray-500">
                    Allow new members to try before paying
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pricing.hasTrial}
                    onChange={(e) =>
                      setPricing({ ...pricing, hasTrial: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {pricing.hasTrial && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trial Duration (days)
                  </label>
                  <input
                    type="number"
                    value={pricing.trialDays}
                    onChange={(e) =>
                      setPricing({
                        ...pricing,
                        trialDays: parseInt(e.target.value) || 7,
                      })
                    }
                    min="1"
                    max="30"
                    className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Pricing Changes</p>
                  <p>
                    When you change pricing, existing members will keep their
                    current rate. New members will be charged the updated price.
                    Make sure to connect your Stripe account in the Payouts
                    section to receive payments.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Pricing
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityPricing;
