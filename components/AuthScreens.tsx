"use client";
import { useState, type FormEvent } from "react";
import { PEOPLE } from "@/lib/constants";
import { useStore } from "@/lib/store";

/** Log in or create an account (live mode only). */
export function LoginScreen() {
  const { auth } = useStore();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && password.length < 8) { setError("Please use a password with at least 8 characters."); return; }
    setBusy(true);
    setError(null);
    const err = mode === "login" ? await auth.signIn(email, password) : await auth.signUp(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <section className="panel">
      <form className="card" onSubmit={submit} style={{ maxWidth: 460 }}>
        <h2>{mode === "login" ? "Log in" : "Create your account"}</h2>
        <p className="hint">
          {mode === "login"
            ? "Use the email and password you signed up with. You stay logged in on this phone."
            : "Each of you makes your own account, then picks His or Hers. Pick a password you'll remember."}
        </p>
        <label className="f">Email
          <input className="t" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="f">Password
          <input className="t" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : undefined}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="hint" role="alert" style={{ color: "var(--warn)" }}>{error}</p>}
        <div className="row">
          <button className="btn" type="submit" disabled={busy}>{busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}</button>
          <button className="btn ghost small" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}>
            {mode === "login" ? "I'm new: create an account" : "I already have an account"}
          </button>
        </div>
      </form>
    </section>
  );
}

/** Choose His or Hers (once per account). */
export function SidePicker() {
  const { mode, auth } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = async (who: "his" | "hers") => {
    setBusy(true);
    setError(null);
    const err = await auth.claimSide(who);
    setBusy(false);
    if (err) setError(err);
  };
  const free = auth.freeSides;
  return (
    <section className="panel">
      <div className="card">
        <h2>{mode === "demo" ? "Who's using this phone?" : "Which one are you?"}</h2>
        {free.length === 0 ? (
          <>
            <p className="hint">Both sides are already taken. This app is just for two people. If this is a mistake, log out and log in with the other account.</p>
            <div className="row"><button className="btn ghost small" onClick={() => auth.signOut()}>Log out</button></div>
          </>
        ) : (
          <>
            <p className="hint">
              {mode === "demo"
                ? "Pick once. The app remembers you, so check-ins and nudges go to the right person."
                : `Pick your side. This links ${auth.email ?? "your account"} to it for good, so choose carefully.`}
            </p>
            <div className="pick">
              {(["his", "hers"] as const).map((who) => (
                <button key={who} className={who} disabled={busy || !free.includes(who)} onClick={() => pick(who)}
                  style={!free.includes(who) ? { opacity: 0.35 } : undefined}>
                  {PEOPLE[who].label}
                </button>
              ))}
            </div>
            {mode === "live" && free.length === 1 && <p className="hint">The other side is already taken by your partner.</p>}
            {error && <p className="hint" role="alert" style={{ color: "var(--warn)" }}>{error}</p>}
          </>
        )}
      </div>
    </section>
  );
}
