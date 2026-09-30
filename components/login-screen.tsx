"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const users = [
  { username: "hamza", label: "Hamza" },
  { username: "bilal", label: "Bilal" },
];

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function LoginScreen() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<string>(users[0].username);
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pinPreview = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => (index < pin.length ? "•" : "○")),
    [pin],
  );

  const handleKeyPress = (value: string) => {
    if (value === "⌫") {
      setPin((current) => current.slice(0, -1));
      return;
    }

    if (value === "") {
      return;
    }

    setPin((current) => {
      if (current.length >= 4) {
        return current;
      }
      return `${current}${value}`;
    });
  };

  const handleSubmit = async () => {
    const trimmedPin = pin.trim();

    if (trimmedPin.length !== 4) {
      setError("Enter a valid 4-digit PIN.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: selectedUser,
          pin: trimmedPin,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to login.");
      }

      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Unable to login.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-[#17312a] sm:px-6">
      <div className="w-full max-w-md overflow-hidden rounded-[36px] border border-white/10 bg-[#111d1a]/90 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="border-b border-white/10 bg-[#d5ff4e] px-6 pb-7 pt-6 text-[#101812]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/indrive-favicon.png"
                alt="InDrive"
                className="h-11 w-11 rounded-2xl object-cover"
              />
              <div>
                <p className="text-sm font-black tracking-tight">inDrive</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-65">
                  Driver tracker
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[#101812]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
              Private
            </span>
          </div>
          <h1 className="mt-8 text-4xl font-black tracking-[-0.06em]">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm font-medium opacity-70">
            Choose your profile and enter your PIN.
          </p>
        </div>

        <div className="p-5">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1">
            {users.map((user) => {
              const isActive = selectedUser === user.username;
              return (
                <button
                  key={user.username}
                  type="button"
                  onClick={() => setSelectedUser(user.username)}
                  className={`rounded-xl px-4 py-3 text-left transition ${
                    isActive
                      ? "bg-white/10 text-[#d5ff4e] shadow-lg shadow-black/10"
                      : "text-white/55 hover:bg-white/5"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Driver
                  </div>
                  <div className="mt-1 text-lg font-semibold">{user.label}</div>
                </button>
              );
            })}
          </div>

          <div className="mb-5 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
              Enter PIN
            </div>
            <div className="flex justify-center gap-3">
              {pinPreview.map((circle, index) => (
                <div
                  key={`${circle}-${index}`}
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    circle === "•"
                      ? "border-[#d5ff4e] bg-[#d5ff4e] shadow-[0_0_14px_rgba(213,255,78,0.5)]"
                      : "border-white/20 bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {keypad.map((value, index) => {
              if (value === "") {
                return <div key={`empty-${index}`} className="h-16" />;
              }

              const isDelete = value === "⌫";

              return (
                <button
                  key={value === "⌫" ? "delete" : value}
                  type="button"
                  onClick={() => handleKeyPress(value)}
                  className={`flex h-16 items-center justify-center rounded-2xl border text-xl font-semibold transition ${
                    isDelete
                      ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      : "border-white/10 bg-white/[0.06] text-white hover:border-[#d5ff4e]/70 hover:bg-[#d5ff4e]/10 hover:text-[#d5ff4e]"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || pin.length !== 4}
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#d5ff4e] px-4 py-3.5 text-sm font-black text-[#101812] transition hover:bg-[#e2ff82] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
          >
            {isSubmitting ? "Checking PIN..." : "Unlock dashboard"}
          </button>
        </div>
      </div>
    </main>
  );
}
