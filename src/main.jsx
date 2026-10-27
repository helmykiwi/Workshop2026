import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import {
  ArrowRight,
  Bell,
  Box,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Gauge,
  Home,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Package,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingDown,
  Truck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { auth, db, storage } from "./firebase";
import "./styles.css";

const cats = [
  "All",
  "Food surplus",
  "Raw material",
  "By-product",
  "Industrial waste",
  "Packaging",
];
const regions = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "W.P. Kuala Lumpur",
  "W.P. Labuan",
  "W.P. Putrajaya",
];
const supplyChoices = [
  "Fresh produce",
  "Dry goods",
  "Packaging",
  "Cooking oil",
  "Coffee grounds & by-products",
  "Industrial materials",
  "Recyclables",
  "Other surplus",
];
const nav = [
  ["Dashboard", "home", Gauge],
  ["Browse", "market", Store],
  ["Group buys", "group", UsersRound],
  ["Impact ledger", "savings", Leaf],
];
const money = (v) => {
  const amount = Number(v);
  if (!Number.isFinite(amount)) return "Price on request";
  return amount === 0 ? "Free" : `RM ${amount.toLocaleString("en-MY")}`;
};
const fit = (x, p) =>
  Math.min(
    99,
    75 +
      Math.max(0, 8 - Math.round(x.km || 4)) +
      Math.round((x.reliability || 90) / 25) +
      (String(p?.lookingFor || "")
        .toLowerCase()
        .split(",")
        .some(
          (k) =>
            k && `${x.name} ${x.category}`.toLowerCase().includes(k.trim()),
        )
        ? 8
        : 0),
  );

function useMarketplace() {
  const [remote, setRemote] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "listings")),
        (s) => {
          setRemote(
            s.docs.map((d) => {
              const x = d.data();
              return {
                id: d.id,
                ...x,
                qty: x.quantity,
                place: x.location,
                seller: x.business,
                km: x.distance || 3.2,
                reliability: x.reliability || 95,
                tone: x.category === "Food surplus" ? "tomato" : "green",
                demo: false,
              };
            }),
          );
          setLoading(false);
          setError("");
        },
        () => {
          setLoading(false);
          setError(
            "Live inventory is temporarily unavailable. Please try again shortly.",
          );
        },
      ),
    [],
  );
  return {
    items: remote,
    liveCount: remote.length,
    loading,
    error,
  };
}

function App() {
  const [user, setUser] = useState(),
    [profile, setProfile] = useState(),
    [authReady, setAuthReady] = useState(false),
    [authOpen, setAuthOpen] = useState(false),
    [authMode, setAuthMode] = useState("login"),
    [needsOnboarding, setNeedsOnboarding] = useState(false),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    market = useMarketplace();
  const ping = (t) => {
    setToast(t);
    clearTimeout(window.__toast);
    window.__toast = setTimeout(() => setToast(""), 3200);
  };
  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u || null);
        setAuthReady(true);
        if (!u) {
          setProfile(null);
          setNeedsOnboarding(false);
          return;
        }
        try {
          const ref = doc(db, "users", u.uid),
            s = await getDoc(ref),
            base = {
              name: u.displayName || "FoodLink member",
              photoURL: u.photoURL || "",
              businessName: "",
              region: "Kuala Lumpur",
              category: "Food & Beverage",
              phone: "",
              lookingFor: "",
              email: u.email || "",
            },
            p = s.exists() ? { ...base, ...s.data() } : base;
          setProfile(p);
          setNeedsOnboarding(!p.onboarded);
        } catch {
          ping("We could not load your profile. Please try again.");
        }
      }),
    [],
  );
  async function login() {
    setBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setAuthOpen(false);
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user")
        ping("Google sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function emailAuth(email, password, isSignup) {
    setBusy(true);
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setAuthOpen(false);
      return null;
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        return "That email already has an account. Try logging in instead.";
      }
      if (error.code === "auth/invalid-credential") {
        return "That email or password does not match our records.";
      }
      if (error.code === "auth/weak-password") {
        return "Use a password with at least 6 characters.";
      }
      if (error.code === "auth/operation-not-allowed") {
        return "Email sign-up is not enabled yet. Please use Google for now.";
      }
      return "We could not continue with that email. Please try again.";
    } finally {
      setBusy(false);
    }
  }
  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };
  async function completeOnboarding(nextProfile) {
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...nextProfile,
          email: user.email || "",
          onboarded: true,
          createdAt: profile?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setProfile(nextProfile);
      setNeedsOnboarding(false);
      ping("Your FoodLink business profile is ready.");
    } catch {
      ping("Your profile could not be saved. Please try again.");
      throw Error("profile-save-failed");
    }
  }
  return (
    <>
      {toast && <Toast text={toast} />}{" "}
      {!authReady ? (
        <main className="auth-loading" role="status" aria-live="polite">
          <Brand />
          <span>Preparing FoodLink…</span>
        </main>
      ) : user && needsOnboarding ? (
        <Onboarding
          user={user}
          profile={profile}
          complete={completeOnboarding}
        />
      ) : user ? (
        <Workspace {...{ user, profile, setProfile, market, ping }} />
      ) : (
        <Landing market={market} openAuth={openAuth} />
      )}
      {!user && authOpen && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          googleLogin={login}
          emailAuth={emailAuth}
          busy={busy}
          close={() => setAuthOpen(false)}
        />
      )}
    </>
  );
}

function AuthModal({ mode, setMode, googleLogin, emailAuth, busy, close }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  const isSignup = mode === "signup";
  const [method, setMethod] = useState("google"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    setError("");
    setPassword("");
    setConfirmPassword("");
  }, [mode, method]);
  async function submitManual(event) {
    event.preventDefault();
    if (isSignup && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    const message = await emailAuth(email, password, isSignup);
    setError(message || "");
  }
  return (
    <div
      className="auth-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          aria-label="Close sign in"
          className="icon-btn auth-close"
          onClick={close}
        >
          <X />
        </button>
        <Brand />
        <div className="auth-switch" role="tablist" aria-label="Account action">
          <button
            role="tab"
            aria-selected={!isSignup}
            className={!isSignup ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            role="tab"
            aria-selected={isSignup}
            className={isSignup ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>
        <span className="auth-kicker">FOODLINK NETWORK</span>
        <h1 id="auth-title">
          {isSignup ? "Build your business profile." : "Welcome back."}
        </h1>
        <p>
          {isSignup
            ? "Choose Google or email, then tell the network what your business needs."
            : "Use Google or your FoodLink email to open the command centre."}
        </p>
        <div
          className="auth-methods"
          role="tablist"
          aria-label="Sign-in method"
        >
          <button
            role="tab"
            aria-selected={method === "google"}
            className={method === "google" ? "active" : ""}
            onClick={() => setMethod("google")}
          >
            Google
          </button>
          <button
            role="tab"
            aria-selected={method === "manual"}
            className={method === "manual" ? "active" : ""}
            onClick={() => setMethod("manual")}
          >
            Email
          </button>
        </div>
        {method === "google" ? (
          <button
            className="google-button"
            onClick={googleLogin}
            disabled={busy}
          >
            <span className="google-mark">G</span>
            {busy ? "Opening Google…" : "Continue with Google"}
            <ArrowRight />
          </button>
        ) : (
          <form className="manual-auth-form" onSubmit={submitManual}>
            <Field label="Email address">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.com"
              />
            </Field>
            <Field label="Password">
              <input
                required
                type="password"
                minLength="6"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </Field>
            {isSignup && (
              <Field label="Confirm password">
                <input
                  required
                  type="password"
                  minLength="6"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                />
              </Field>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button ink full" disabled={busy}>
              {busy
                ? "Checking details…"
                : isSignup
                  ? "Create with email"
                  : "Log in with email"}{" "}
              <ArrowRight />
            </button>
          </form>
        )}
        <small>
          {isSignup
            ? "After sign-up, we will ask for your business details."
            : "New to FoodLink? Choose Sign up above."}
        </small>
      </section>
    </div>
  );
}

function Onboarding({ user, profile, complete }) {
  const [form, setForm] = useState(() => ({
      name: profile?.name || user.displayName || "",
      businessName: profile?.businessName || "",
      category: profile?.category || "Food & Beverage",
      region: regions.includes(profile?.region) ? profile.region : "Selangor",
      phone: profile?.phone || "",
      lookingFor: profile?.lookingFor || "",
      photoURL: profile?.photoURL || user.photoURL || "",
    })),
    [selectedSupplies, setSelectedSupplies] = useState(() =>
      String(profile?.lookingFor || "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => supplyChoices.includes(item)),
    ),
    [photoFile, setPhotoFile] = useState(null),
    [photoPreview, setPhotoPreview] = useState(
      profile?.photoURL || user.photoURL || "",
    ),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggleSupply = (supply) => {
    setSelectedSupplies((current) =>
      current.includes(supply)
        ? current.filter((item) => item !== supply)
        : [...current, supply],
    );
  };
  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for your profile photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Your profile photo must be 5 MB or smaller.");
      return;
    }
    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };
  async function submit(event) {
    event.preventDefault();
    if (!selectedSupplies.length) {
      setError("Choose at least one type of supply you are looking for.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let photoURL = form.photoURL;
      if (photoFile) {
        const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const imageRef = storageRef(
          storage,
          `profilePhotos/${user.uid}/${Date.now()}-${safeName}`,
        );
        await uploadBytes(imageRef, photoFile, { contentType: photoFile.type });
        photoURL = await getDownloadURL(imageRef);
      }
      await complete({
        ...form,
        photoURL,
        lookingFor: selectedSupplies.join(", "),
      });
    } catch {
      setError("We could not save your profile or photo. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <Brand />
        <span>SETUP / 01 OF 01</span>
      </header>
      <form className="onboarding-card" onSubmit={submit}>
        <div className="onboarding-intro">
          <span>YOUR BUSINESS PROFILE</span>
          <h1>Tell the network what helps your business move.</h1>
          <p>
            These details help FoodLink surface nearby supply and relevant group
            buys. You can edit them later.
          </p>
        </div>
        <section className="onboarding-photo">
          <Avatar profile={{ ...form, photoURL: photoPreview }} />
          <div>
            <b>Profile photo</b>
            <p>
              Upload a clear business or personal photo. JPG, PNG or WebP, up to
              5 MB.
            </p>
            <label className="photo-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={choosePhoto}
              />
              <span>
                {photoFile ? "Choose a different photo" : "Upload your photo"}
              </span>
            </label>
            {photoFile && (
              <small className="photo-file-name">
                {photoFile.name} ready to upload
              </small>
            )}
          </div>
        </section>
        <div className="onboarding-grid">
          <Field label="Your name">
            <input required value={form.name} onChange={update("name")} />
          </Field>
          <Field label="Business name">
            <input
              required
              value={form.businessName}
              onChange={update("businessName")}
              placeholder="e.g. Aina Bakery"
            />
          </Field>
          <Field label="Business type">
            <select value={form.category} onChange={update("category")}>
              {[
                "Food & Beverage",
                "Retail",
                "Agriculture",
                "Manufacturing",
                "Hospitality",
                "Recycling",
                "Other",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Operating area">
            <select value={form.region} onChange={update("region")}>
              {regions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Phone number">
            <input
              required
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={update("phone")}
              placeholder="e.g. 012-345 6789"
            />
          </Field>
          <div className="onboarding-wide">
            <fieldset className="supply-picker">
              <legend>What supplies are you looking for?</legend>
              <p>Select all that apply so FoodLink can match you properly.</p>
              <div className="supply-options">
                {supplyChoices.map((supply) => {
                  const selected = selectedSupplies.includes(supply);
                  return (
                    <label className={selected ? "selected" : ""} key={supply}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSupply(supply)}
                      />
                      <span>{supply}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="button lime onboarding-submit" disabled={saving}>
          {saving ? "Saving profile…" : "Enter FoodLink"} <ArrowRight />
        </button>
      </form>
    </main>
  );
}

const Brand = ({ inverse = false, onClick, href = "#top" }) => (
  <a
    className={`brand ${inverse ? "inverse" : ""}`}
    href={href}
    onClick={onClick}
    aria-label="FoodLink home"
  >
    <span>
      <Route />
    </span>
    <b>FOODLINK</b>
    <small>MY</small>
  </a>
);

function Landing({ market, openAuth }) {
  const [q, setQ] = useState(""),
    [cat, setCat] = useState("All");
  const shown = market.items.filter(
    (x) =>
      (cat === "All" || x.category === cat) &&
      `${x.name} ${x.category} ${x.place}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <div className="site-shell" id="top">
      <header className="public-header">
        <Brand />
        <nav>
          <a href="#exchange">Browse</a>
          <a href="#network">How it works</a>
          <a href="#impact">Less waste</a>
        </nav>
        <button className="button lime small" onClick={() => openAuth("login")}>
          Enter network <ArrowRight />
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="live-label">
              <i /> Marketplace for Malaysian businesses
            </div>
            <h1>Find useful surplus near your business.</h1>
            <p>
              Browse available stock, check the pickup area and reserve only
              the amount you need. Listing your own surplus is just as easy.
            </p>
            <div className="hero-actions">
              <a className="button lime" href="#exchange">
                Browse below <ArrowRight />
              </a>
              <a className="text-link" href="#exchange">
                See available supplies <ArrowRight />
              </a>
            </div>
            <dl className="hero-facts">
              <div>
                <dt>One network</dt>
                <dd>Buy + list stock</dd>
              </div>
              <div>
                <dt>Local first</dt>
                <dd>Choose your area</dd>
              </div>
              <div>
                <dt>Shared route</dt>
                <dd>Join a group buy</dd>
              </div>
            </dl>
          </div>
          <DispatchBoard />
        </section>
        <section className="ticker">
          {[
            "LIST SURPLUS",
            "MATCH NEARBY DEMAND",
            "POOL PURCHASES",
            "CONSOLIDATE DELIVERY",
            "TRACK IMPACT",
          ].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </section>
        <section className="exchange-section" id="exchange">
          <SectionTitle
            title="Surplus near you"
            text="Search what is available, see the pickup area, and reserve what your business needs."
            side={
              <div className="exchange-count">
                <b>{market.liveCount}</b> live listings connected
              </div>
            }
          />
          <div className="exchange-toolbar">
            <label className="search-field">
              <Search />
              <input
                aria-label="Search the public exchange"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search item, category or area"
              />
            </label>
            <Filters value={cat} set={setCat} />
          </div>
          {market.error && <div className="notice">{market.error}</div>}
          <div className="listing-grid">
            {shown.slice(0, 6).map((x, i) => (
              <ListingCard key={x.id} item={x} index={i} publicMode />
            ))}
          </div>
          {!shown.length && (
            <Empty
              icon={Search}
              title="No matching stock"
              text="Try another category or nearby area."
            />
          )}
        </section>
        <section className="network-section" id="network">
          <div>
            <h2>Every action moves through one shared operating loop.</h2>
            <p>
              FoodLink keeps sourcing, surplus, buying groups and impact in the
              same record—so the network becomes more useful with every
              transaction.
            </p>
            <span className="button ink demo-action">
              Business profile preview <span>DEMO</span>
            </span>
          </div>
          <ol>
            {[
              [
                "Signal supply or demand",
                "List surplus or tell the network what your business needs next.",
              ],
              [
                "Rank the useful matches",
                "Compare proximity, price, available stock and supplier reliability.",
              ],
              [
                "Combine the route",
                "Pool similar demand and consolidate delivery into a practical run.",
              ],
              [
                "Keep the impact ledger",
                "Turn account activity into understandable savings and trip estimates.",
              ],
            ].map((x, i) => (
              <li key={x[0]}>
                <span>0{i + 1}</span>
                <div>
                  <b>{x[0]}</b>
                  <p>{x[1]}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="impact-section" id="impact">
          <div className="impact-word">
            LESS
            <br />
            WASTE.
          </div>
          <div>
            <Leaf />
            <h2>
              Circular economy becomes useful when it fits the purchasing day.
            </h2>
            <p>
              No separate sustainability workflow. The impact follows the
              transaction: supply reused, demand combined and routes avoided.
            </p>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Brand inverse />
        <p>Local supply. Less waste. Better margins.</p>
        <span className="text-link light demo-link">
          Demo preview <span>· use Enter network to sign in</span>
        </span>
      </footer>
    </div>
  );
}

function DispatchBoard() {
  return (
    <div className="dispatch">
      <header>
        <span>DISPATCH / KB-104</span>
        <b>GROUP BUY ACTIVE</b>
      </header>
      <div className="dispatch-route">
        <div className="supplier">
          <Store />
          <span>
            <b>Maju Supply Co.</b>
            <small>95 kg confirmed</small>
          </span>
        </div>
        <div className="route-line">
          <i>
            <Truck />
          </i>
        </div>
        <div className="stops">
          {[
            ["Bangsar", "30 kg"],
            ["Petaling Jaya", "40 kg"],
            ["TTDI", "25 kg"],
          ].map((x, i) => (
            <div key={x[0]}>
              <em>0{i + 1}</em>
              <span>
                <b>{x[0]}</b>
                <small>{x[1]}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="dispatch-summary">
        <div>
          <span>Combined order</span>
          <b>RM 468</b>
        </div>
        <div>
          <span>Estimated saving</span>
          <b>RM 152</b>
        </div>
        <div>
          <span>Delivery plan</span>
          <b>1 route</b>
        </div>
      </div>
      <p>
        Illustrative scenario based on the product workflow—not a verified live
        transaction.
      </p>
    </div>
  );
}

function Workspace({ user, profile, setProfile, market, ping }) {
  const [view, setView] = useState("home"),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState(false),
    [panel, setPanel] = useState(),
    [picked, setPicked] = useState();
  const go = (v) => {
    setView(v);
    setMenu(false);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="workspace">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="sidebar-head">
          <Brand inverse href="#command-centre" onClick={() => go("home")} />
          <button
            aria-label="Close navigation"
            className="icon-btn close-nav"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([label, id, Icon]) => (
            <button
              className={view === id ? "active" : ""}
              onClick={() => go(id)}
              key={id}
            >
              <Icon />
              <span>{label}</span>
              <i />
            </button>
          ))}
        </nav>
        <div className="network-signal">
          <span>MARKETPLACE STATUS</span>
          <b>{market.liveCount ? "Listings available" : "No listings yet"}</b>
          <small>
            {market.liveCount
              ? `${market.liveCount} active listings`
              : "Create the first listing to start browsing"}
          </small>
        </div>
        <button className="side-profile" onClick={() => go("profile")}>
          <Avatar profile={profile} />
          <span>
            <b>{profile?.name || "Loading…"}</b>
            <small>{profile?.category}</small>
          </span>
          <ChevronDown />
        </button>
      </aside>
      {menu && (
        <button
          aria-label="Close navigation"
          className="scrim"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace-main">
        <header className="workspace-header">
          <button
            aria-label="Open navigation"
            className="icon-btn mobile-menu"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <div className="workspace-location">
            <span>Your pickup area</span>
            <b>
              <MapPin /> {profile?.region || "Choose an area"}
            </b>
          </div>
          <section>
            <button className="button ink small" onClick={() => go("sell")}>
              <Plus /> List surplus
            </button>
            <button
              aria-label="Open business profile"
              className="avatar-button"
              onClick={() => go("profile")}
            >
              <Avatar profile={profile} />
            </button>
          </section>
        </header>
        {market.error && <div className="workspace-notice">{market.error}</div>}
        {view === "home" && (
          <Command {...{ user, profile, items: market.items, go, setPicked }} />
        )}
        {view === "market" && (
          <Exchange
            {...{
              user,
              profile,
              items: market.items,
              loading: market.loading,
              setPicked,
            }}
          />
        )}
        {view === "group" && <GroupBuys {...{ user, profile, ping }} />}
        {view === "savings" && <Ledger user={user} />}
        {view === "sell" && <Sell {...{ user, profile, ping }} />}
        {view === "profile" && (
          <Profile {...{ user, profile, setProfile, ping }} />
        )}
      </div>
      <nav className="mobile-tabbar" aria-label="Main navigation">
        <button aria-current={view === "home" ? "page" : undefined} className={view === "home" ? "active" : ""} onClick={() => go("home")}>
          <Home />
          <span>Home</span>
        </button>
        <button aria-current={view === "market" ? "page" : undefined} className={view === "market" ? "active" : ""} onClick={() => go("market")}>
          <Store />
          <span>Browse</span>
        </button>
        <button
          aria-current={view === "sell" ? "page" : undefined}
          className={`list-tab ${view === "sell" ? "active" : ""}`}
          onClick={() => go("sell")}
        >
          <Plus />
          <span>List</span>
        </button>
        <button aria-current={view === "group" ? "page" : undefined} className={view === "group" ? "active" : ""} onClick={() => go("group")}>
          <UsersRound />
          <span>Groups</span>
        </button>
        <button aria-current={view === "profile" ? "page" : undefined} className={view === "profile" ? "active" : ""} onClick={() => go("profile")}>
          <UserRound />
          <span>Profile</span>
        </button>
      </nav>
      {picked && (
        <Drawer
          title="Reserve supply"
          sub="Review listing and match quality"
          close={() => setPicked()}
        >
          <Reserve
            item={picked}
            {...{ user, profile, ping }}
            close={() => setPicked()}
          />
        </Drawer>
      )}
    </div>
  );
}

const PageHead = ({ title, text, action }) => (
  <div className="page-head">
    <div>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
    {action}
  </div>
);
function Command({ user, profile, items, go, setPicked }) {
  const [orders, setOrders] = useState([]);
  useEffect(
    () =>
      user
        ? onSnapshot(
            query(collection(db, "orders"), where("buyerId", "==", user.uid)),
            (s) => setOrders(s.docs.map((d) => d.data())),
            () => {},
          )
        : undefined,
    [user],
  );
  const rec = useMemo(
      () =>
        [...items]
          .filter(
            (x) => x.status === "available" && x.sellerId !== user?.uid,
          )
          .sort((a, b) => fit(b, profile) - fit(a, profile))
          .slice(0, 4),
      [items, profile, user],
    ),
    spend = orders.reduce((n, o) => n + Number(o.total || 0), 0),
    trips = Math.max(0, orders.length - 1);
  return (
    <main className="workspace-page">
      <PageHead
        title={`Welcome back, ${profile?.name?.split(" ")[0] || "there"}.`}
        text="Use Browse to find supplies, List surplus to offer stock, or Group buys to combine an order with other businesses."
        action={
          <button className="button ghost" onClick={() => go("market")}>
            Browse supply <ArrowRight />
          </button>
        }
      />
      <div className="metric-strip">
        <Metric
          icon={CircleDollarSign}
          label="Your savings"
          value={money(Math.round(spend * 0.15))}
          note={`${orders.length} confirmed purchases`}
        />
        <Metric
          icon={Route}
          label="Combined deliveries"
          value={trips}
          note="Based on your purchases"
        />
        <Metric
          icon={Leaf}
          label="Estimated impact"
          value={`${(trips * 7.2).toFixed(1)} kg`}
          note="Shown after a purchase"
        />
        <Metric
          icon={Boxes}
          label="Suggested supplies"
          value={rec.length}
          note="Based on your business profile"
        />
      </div>
      <section className="command-grid">
        <div className="panel wide">
          <PanelHead
            title="Supplies you may need"
            text="Suggestions based on your business profile"
            side="SUGGESTED FOR YOU"
          />
          <div className="match-list">
            {rec.length ? (
              rec.map((x, i) => (
                <button key={x.id} onClick={() => setPicked(x)}>
                  <span className={`swatch tone-${x.tone}`}>
                    <Package />
                  </span>
                  <span>
                    <small>
                      {x.category} · {x.place}
                    </small>
                    <b>{x.name}</b>
                    <em>{x.seller}</em>
                  </span>
                  <strong>
                    {fit(x, profile)}%<small>FIT</small>
                  </strong>
                  <strong>
                    {money(x.price)}
                    <small>
                      {x.remainingQuantity ?? x.quantity ?? x.qty} {x.unit}
                    </small>
                  </strong>
                  <ArrowRight />
                </button>
              ))
            ) : (
              <Empty
                icon={Package}
                title="No matches yet"
                text="When businesses publish live listings, the best matches for your profile appear here."
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Exchange({ user, profile, items, loading, setPicked }) {
  const [q, setQ] = useState(""),
    [cat, setCat] = useState("All"),
    [sort, setSort] = useState("fit");
  const shown = useMemo(
    () =>
      items
        .filter(
          (x) =>
            x.status === "available" &&
            (cat === "All" || x.category === cat) &&
            `${x.name} ${x.place} ${x.seller}`
              .toLowerCase()
              .includes(q.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "price"
            ? a.price - b.price
            : sort === "name"
              ? String(a.name).localeCompare(String(b.name))
              : fit(b, profile) - fit(a, profile),
        ),
    [items, cat, q, sort, profile],
  );
  return (
    <main className="workspace-page">
      <PageHead
        title="Surplus near you"
        text="Tap any item to see the seller, choose how much you need and reserve it."
        action={
          <div className="result-count">
            <b>{shown.length}</b>
            <span>results</span>
          </div>
        }
      />
      <div className="exchange-controls">
        <label className="search-field light-field">
          <Search />
          <input
            aria-label="Search available supply"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search supply, seller or location"
          />
        </label>
        <label className="select-field">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="fit">Best profile fit</option>
            <option value="price">Lowest price</option>
            <option value="name">Name A-Z</option>
          </select>
        </label>
      </div>
      <Filters value={cat} set={setCat} workspace />
      <p className="browse-helper">
        Every card shows the current stock and pickup area before you reserve.
      </p>
      {loading ? (
        <Loading />
      ) : (
        <div className="listing-grid workspace-listings">
          {shown.map((x, i) => (
            <ListingCard
              key={x.id}
              item={x}
              index={i}
              score={fit(x, profile)}
              owner={x.sellerId === user?.uid}
              action={() => x.sellerId !== user?.uid && setPicked(x)}
            />
          ))}
        </div>
      )}
      {!loading && !shown.length && (
        <Empty
          icon={Search}
          title="Nothing matches this filter"
          text="Clear the category or try a broader search."
        />
      )}
    </main>
  );
}

function GroupBuys({ user, profile, ping }) {
  const [groups, setGroups] = useState([]),
    [open, setOpen] = useState(false),
    [f, setF] = useState({
      item: "Cooking oil",
      quantity: 20,
      unit: "kg",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    });
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "groupBuys")),
        (s) => setGroups(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {},
      ),
    [],
  );
  async function create(e) {
    e.preventDefault();
    try {
      await addDoc(collection(db, "groupBuys"), {
        ...f,
        quantity: +f.quantity,
        ownerId: user.uid,
        ownerName: profile.name,
        region: profile.region,
        status: "open",
        memberIds: [user.uid],
        createdAt: serverTimestamp(),
      });
      ping("Group buy published to nearby members.");
      setOpen(false);
    } catch {
      ping("The group buy could not be published.");
    }
  }
  async function join(group) {
    if (group.ownerId === user.uid || group.memberIds?.includes(user.uid))
      return;
    try {
      await updateDoc(doc(db, "groupBuys", group.id), {
        memberIds: [...(group.memberIds || []), user.uid],
      });
      ping(`You joined the ${group.item} group buy.`);
    } catch {
      ping("This group buy could not be joined. Please try again.");
    }
  }
  return (
    <main className="workspace-page">
      <PageHead
        title="Group buys"
        text="Combine nearby demand into one stronger order and a simpler delivery route."
        action={
          <button className="button ink" onClick={() => setOpen(!open)}>
            <Plus /> Start group buy
          </button>
        }
      />
      {open && (
        <form className="inline-form" onSubmit={create}>
          <PanelHead
            title="New demand signal"
            text="Tell nearby businesses what you need and when."
          />
          <div className="form-grid">
            <Field label="Item needed">
              <input
                value={f.item}
                onChange={(e) => setF({ ...f, item: e.target.value })}
              />
            </Field>
            <Field label="Quantity">
              <input
                type="number"
                min="1"
                value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: e.target.value })}
              />
            </Field>
            <Field label="Unit">
              <select
                value={f.unit}
                onChange={(e) => setF({ ...f, unit: e.target.value })}
              >
                <option>kg</option>
                <option>L</option>
                <option>packs</option>
              </select>
            </Field>
            <Field label="Need by">
              <input
                type="date"
                value={f.deadline}
                onChange={(e) => setF({ ...f, deadline: e.target.value })}
              />
            </Field>
          </div>
          <button className="button lime">
            Publish demand signal <ArrowRight />
          </button>
        </form>
      )}
      <section className="owned-groups">
        <PanelHead
          title="Live community signals"
          text="Group buys stored in this project"
          side={`${groups.length} TOTAL`}
        />
        {groups.length ? (
          <div className="data-table">
            {groups.map((g) => (
              <div className="data-row" key={g.id}>
                <span>
                  <b>{g.item}</b>
                  <small>{g.region}</small>
                </span>
                <span>
                  {g.quantity} {g.unit}
                </span>
                <span>{g.memberIds?.length || 1} members</span>
                <span className="chip soft">{g.status || "open"}</span>
                <span>{g.deadline}</span>
                <button
                  className="button ghost small"
                  disabled={
                    g.ownerId === user.uid || g.memberIds?.includes(user.uid)
                  }
                  onClick={() => join(g)}
                >
                  {g.ownerId === user.uid
                    ? "Your group"
                    : g.memberIds?.includes(user.uid)
                      ? "Joined"
                      : "Join group"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={UsersRound}
            title="No live group buys yet"
            text="Start the first demand signal."
          />
        )}
      </section>
    </main>
  );
}

function Demand({ profile, items, go }) {
  const plans = [
    ["Fresh produce", Leaf, "4 days", 82],
    ["Packaging", Box, "9 days", 61],
    ["Cooking oil", Package, "14 days", 38],
  ];
  return (
    <main className="workspace-page">
      <PageHead
        title="Demand plan"
        text={`A practical restock view for ${profile?.category || "your business"}, using profile signals and nearby availability.`}
      />
      <div className="forecast-board">
        {plans.map(([name, Icon, days, c]) => (
          <article key={name}>
            <Icon />
            <span>RESTOCK WINDOW</span>
            <h2>{name}</h2>
            <b>{days}</b>
            <Progress value={c} />
            <small>{c}% illustrative confidence</small>
            <button className="button ghost" onClick={() => go("market")}>
              Find available supply <ArrowRight />
            </button>
          </article>
        ))}
      </div>
      <div className="method-note">
        <ShieldCheck />
        <div>
          <b>How this plan works</b>
          <p>
            This prototype uses your profile and exchange inventory. It does not
            yet train on historical purchasing data.
          </p>
        </div>
        <span>{items.length} inventory signals</span>
      </div>
    </main>
  );
}

function Ledger({ user }) {
  const [orders, setOrders] = useState([]),
    [loading, setLoading] = useState(true);
  useEffect(
    () =>
      user
        ? onSnapshot(
            query(collection(db, "orders"), where("buyerId", "==", user.uid)),
            (s) => {
              setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })));
              setLoading(false);
            },
            () => setLoading(false),
          )
        : undefined,
    [user],
  );
  const spend = orders.reduce((n, o) => n + Number(o.total || 0), 0),
    trips = Math.max(0, orders.length - 1);
  return (
    <main className="workspace-page">
      <PageHead
        title="Impact ledger"
        text="Account-linked activity translated into clear cost, route and emissions estimates."
      />
      {loading ? (
        <Loading />
      ) : orders.length ? (
        <>
          <section className="ledger-hero">
            <div>
              <span>ESTIMATED ACCOUNT SAVING</span>
              <strong>{money(Math.round(spend * 0.15))}</strong>
              <p>
                Modelled at 15% against separate purchasing. This is an
                estimate, not an audited claim.
              </p>
            </div>
            <div>
              <Route />
              <b>{trips}</b>
              <span>trips consolidated</span>
            </div>
          </section>
          <div className="metric-strip three">
            <Metric
              icon={Leaf}
              label="CO₂e avoided"
              value={`${(trips * 7.2).toFixed(1)} kg`}
              note="Route estimate"
            />
            <Metric
              icon={CircleDollarSign}
              label="Value reserved"
              value={money(spend)}
              note="Account orders"
            />
            <Metric
              icon={Package}
              label="Transactions"
              value={orders.length}
              note="Recorded in Firestore"
            />
          </div>
          <div className="transaction-table">
            <div className="data-row head">
              <span>Item</span>
              <span>Seller</span>
              <span>Status</span>
              <span>Total</span>
            </div>
            {orders.map((o) => (
              <div className="data-row" key={o.id}>
                <span>
                  <b>{o.itemName}</b>
                  <small>{o.listingId}</small>
                </span>
                <span>{o.sellerName}</span>
                <span className="chip soft">{o.status}</span>
                <b>{money(o.total)}</b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty
          icon={Leaf}
          title="Your ledger starts with a transaction"
          text="Reserve live inventory or create a group buy."
        />
      )}
    </main>
  );
}

function ListingCard({ item, index, score, action, publicMode, owner = false }) {
  const CardContent = publicMode ? "div" : "button";
  return (
    <article className="listing-card">
      <CardContent
        {...(publicMode
          ? {
              className: "listing-card-preview",
              "aria-label": `${item.name} demo preview`,
            }
          : { type: "button", onClick: action, disabled: owner })}
      >
        <div className={`listing-visual tone-${item.tone}`}>
          {item.imageURL ? (
            <img src={item.imageURL} alt={`${item.name} listing`} />
          ) : (
            <Package />
          )}
          <small className="availability-badge">
            {item.status === "available" ? "Available now" : "No longer available"}
          </small>
        </div>
        <div className="listing-body">
          <span>{item.category}</span>
          <h3>{item.name}</h3>
          <p>{item.seller}</p>
          <dl>
            <div>
              <dt>Available</dt>
              <dd>
                {item.remainingQuantity ?? item.quantity ?? item.qty}{" "}
                {item.unit}
              </dd>
            </div>
            <div>
              <dt>Pickup</dt>
              <dd>{item.place || item.location || "Ask the seller"}</dd>
            </div>
          </dl>
          <footer>
            <strong>
              {money(item.price)}
              {!item.demo && <small> / {item.unit}</small>}
            </strong>
            {owner ? (
              <span className="owner-listing-label">Your listing</span>
            ) : publicMode ? (
              <span className="listing-preview-note">Preview only</span>
            ) : score ? (
              <span>
                <Sparkles /> {score}% fit
              </span>
            ) : (
              <Plus aria-label="Reserve this listing" />
            )}
          </footer>
        </div>
      </CardContent>
    </article>
  );
}
function Sell({ user, profile, ping }) {
  const [f, setF] = useState({
      name: "",
      category: "Food surplus",
      quantity: "",
      unit: "kg",
      location: profile?.region || "Kuala Lumpur",
      price: 0,
    }),
    [image, setImage] = useState(null),
    [preview, setPreview] = useState(""),
    [saving, setSaving] = useState(false);
  const analysis = useMemo(() => {
    if (!image) return null;
    const categoryHint =
      f.category === "Packaging"
        ? "packaging material"
        : f.category === "Food surplus"
          ? "food surplus"
          : f.category.toLowerCase();
    return {
      label: `Likely ${categoryHint}`,
      note: "AI-assisted listing draft uses the selected category and image details. Review the final title and category before publishing.",
    };
  }, [image, f.category]);
  function chooseImage(event) {
    const file = event.target.files?.[0];
    if (
      !file ||
      !file.type.startsWith("image/") ||
      file.size > 5 * 1024 * 1024
    ) {
      ping("Choose an image smaller than 5 MB.");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let imageURL = "";
      if (image) {
        const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const imageRef = storageRef(
          storage,
          `listingPhotos/${user.uid}/${Date.now()}-${safeName}`,
        );
        await uploadBytes(imageRef, image, { contentType: image.type });
        imageURL = await getDownloadURL(imageRef);
      }
      await addDoc(collection(db, "listings"), {
        ...f,
        quantity: +f.quantity,
        remainingQuantity: +f.quantity,
        price: +f.price,
        sellerId: user.uid,
        seller: profile.businessName || profile.name,
        business: profile.businessName || profile.name,
        place: f.location,
        imageURL,
        status: "available",
        createdAt: serverTimestamp(),
      });
      ping("Listing published to the exchange.");
      setF({ ...f, name: "", quantity: "", price: 0 });
      setImage(null);
      setPreview("");
    } catch {
      ping("The listing could not be published.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="workspace-page form-page">
      <PageHead
        title="List your surplus"
        text="Add clear stock details so nearby businesses can reserve the exact amount they need."
      />
      <form className="listing-form" onSubmit={submit}>
        <section className="listing-form-main">
          <Field label="What are you offering?">
            <input
              required
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <select
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value })}
            >
              {cats.slice(1).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <div className="form-grid two">
            <Field label="Quantity">
              <input
                required
                type="number"
                min="1"
                value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: e.target.value })}
              />
            </Field>
            <Field label="Unit">
              <select
                value={f.unit}
                onChange={(e) => setF({ ...f, unit: e.target.value })}
              >
                <option>kg</option>
                <option>L</option>
                <option>packs</option>
                <option>units</option>
              </select>
            </Field>
          </div>
          <Field label="Pickup area">
            <select
              value={f.location}
              onChange={(e) => setF({ ...f, location: e.target.value })}
            >
              {regions.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          </Field>
          <Field label={`Price per ${f.unit} (RM)`}>
            <input
              type="number"
              min="0"
              value={f.price}
              onChange={(e) => setF({ ...f, price: e.target.value })}
            />
          </Field>
        </section>
        <aside className="listing-photo-panel">
          <b>Listing photo</b>
          <p>
            A good photo makes the listing easier to trust and helps the
            matching assistant suggest the right category.
          </p>
          <label className="photo-upload">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={chooseImage}
            />
            <span>{image ? "Change photo" : "Upload photo"}</span>
          </label>
          {preview && (
            <img
              className="listing-upload-preview"
              src={preview}
              alt="Listing upload preview"
            />
          )}
          {analysis && (
            <div className="ai-note">
              <Sparkles />
              <div>
                <b>AI listing check: {analysis.label}</b>
                <small>{analysis.note}</small>
              </div>
            </div>
          )}
        </aside>
        <div className="form-note">
          <ShieldCheck /> Your account remains the listing owner.
        </div>
        <button className="button lime full" disabled={saving}>
          {saving ? "Publishing…" : "Publish listing"} <ArrowRight />
        </button>
      </form>
    </main>
  );
}
function Profile({ user, profile, setProfile, ping }) {
  const [f, setF] = useState({ ...profile }),
    [photo, setPhoto] = useState(null),
    [preview, setPreview] = useState(profile?.photoURL || ""),
    [saving, setSaving] = useState(false),
    [myListings, setMyListings] = useState([]),
    [removing, setRemoving] = useState("");
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "listings"), where("sellerId", "==", user.uid)),
        (snapshot) =>
          setMyListings(
            snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
          ),
        () => setMyListings([]),
      ),
    [user.uid],
  );
  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (
      !file ||
      !file.type.startsWith("image/") ||
      file.size > 5 * 1024 * 1024
    ) {
      ping("Choose an image smaller than 5 MB.");
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }
  async function removeListing(listing) {
    if (!window.confirm(`Delete “${listing.name}”? This cannot be undone.`))
      return;
    setRemoving(listing.id);
    try {
      await deleteDoc(doc(db, "listings", listing.id));
      ping("Listing deleted.");
    } catch {
      ping("This listing could not be deleted.");
    } finally {
      setRemoving("");
    }
  }
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let photoURL = f.photoURL || "";
      if (photo) {
        const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const imageRef = storageRef(
          storage,
          `profilePhotos/${user.uid}/${Date.now()}-${safeName}`,
        );
        await uploadBytes(imageRef, photo, { contentType: photo.type });
        photoURL = await getDownloadURL(imageRef);
      }
      const nextProfile = { ...f, photoURL };
      await setDoc(
        doc(db, "users", user.uid),
        { ...nextProfile, updatedAt: serverTimestamp() },
        { merge: true },
      );
      setProfile(nextProfile);
      ping("Business profile updated.");
    } catch {
      ping("Profile could not be updated.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="workspace-page profile-page">
      <PageHead
        title="Business profile"
        text="Keep your contact, operating area and sourcing preferences up to date for better matches."
      />
      <form className="profile-editor" onSubmit={save}>
        <section className="profile-photo-card">
          <Avatar profile={{ ...f, photoURL: preview }} />
          <div>
            <b>Profile photo</b>
            <p>
              Use your own logo or a clear photo. This replaces the Google
              account image.
            </p>
            <label className="photo-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={choosePhoto}
              />
              <span>{photo ? "Change photo" : "Upload new photo"}</span>
            </label>
          </div>
        </section>
        <section className="profile-fields">
          <Field label="Display name">
            <input
              value={f.name || ""}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </Field>
          <Field label="Region">
            <select
              value={f.region || ""}
              onChange={(e) => setF({ ...f, region: e.target.value })}
            >
              {regions.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Business category">
            <select
              value={f.category || ""}
              onChange={(e) => setF({ ...f, category: e.target.value })}
            >
              {[
                "Food & Beverage",
                "Retail",
                "Agriculture",
                "Manufacturing",
                "Hospitality",
                "Recycling",
                "Other",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Phone number">
            <input
              value={f.phone || ""}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </Field>
        </section>
        <button className="button lime full" disabled={saving}>
          {saving ? "Saving…" : "Save profile"} <Check />
        </button>
        <button type="button" className="logout" onClick={() => signOut(auth)}>
          <LogOut /> Log out
        </button>
      </form>
      <section className="my-listings">
        <PanelHead
          title="My listings"
          text="Manage surplus that your business has published."
          side={`${myListings.length} ACTIVE`}
        />
        {myListings.length ? (
          <div className="my-listing-list">
            {myListings.map((listing) => (
              <article key={listing.id}>
                <div>
                  <b>{listing.name}</b>
                  <small>
                    {listing.remainingQuantity ?? listing.quantity}{" "}
                    {listing.unit} available · {listing.place}
                  </small>
                </div>
                <span>
                  {money(listing.price)} / {listing.unit}
                </span>
                <button
                  className="text-danger"
                  type="button"
                  disabled={removing === listing.id}
                  onClick={() => removeListing(listing)}
                >
                  {removing === listing.id ? "Deleting…" : "Delete listing"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={Package}
            title="No listings yet"
            text="Use “List surplus” when you have stock to share or sell."
          />
        )}
      </section>
    </main>
  );
}
function Reserve({ item, user, profile, ping, close }) {
  const available = Number(
    item.remainingQuantity ?? item.quantity ?? item.qty ?? 0,
  );
  const [quantity, setQuantity] = useState(Math.min(1, available)),
    [saving, setSaving] = useState(false);
  async function reserve() {
    if (item.demo)
      return ping("This demo listing cannot create a real transaction.");
    if (item.sellerId === user.uid)
      return ping("You cannot reserve your own listing.");
    setSaving(true);
    try {
      await runTransaction(db, async (t) => {
        const ref = doc(db, "listings", item.id),
          s = await t.get(ref);
        if (!s.exists() || s.data().status !== "available")
          throw Error("unavailable");
        const live = s.data();
        if (live.sellerId === user.uid) throw Error("owner");
        const liveAvailable = Number(
          live.remainingQuantity ?? live.quantity ?? 0,
        );
        if (
          !Number.isFinite(+quantity) ||
          +quantity < 1 ||
          +quantity > liveAvailable
        )
          throw Error("quantity");
        const remainingQuantity = liveAvailable - +quantity;
        t.update(ref, {
          remainingQuantity,
          status: remainingQuantity ? "available" : "sold",
        });
        t.set(doc(db, "orders", `${item.id}_${user.uid}`), {
          listingId: item.id,
          itemName: live.name,
          buyerId: user.uid,
          buyerName: profile.name,
          sellerId: live.sellerId,
          sellerName: live.business,
          quantity: +quantity,
          unit: live.unit,
          unitPrice: +live.price || 0,
          total: (+live.price || 0) * +quantity,
          status: "confirmed",
          createdAt: serverTimestamp(),
        });
      });
      ping(`${quantity} ${item.unit} reserved and added to your ledger.`);
      close();
    } catch (e) {
      ping(
        e.message === "unavailable"
          ? "This listing is no longer available."
          : e.message === "owner"
            ? "You cannot reserve your own listing."
          : e.message === "quantity"
            ? "Choose an amount within the available stock."
            : "Reservation failed. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="reserve">
      <div className={`reserve-visual tone-${item.tone}`}>
        <Package />
        <span>{item.category}</span>
      </div>
      <h2>{item.name}</h2>
      <p>
        {available} {item.unit} still available from {item.seller}
      </p>
      <div className="match-breakdown">
        <div>
          <span>Price</span>
          <b>
            {money(item.price)} / {item.unit}
          </b>
        </div>
        <div>
          <span>Available now</span>
          <b>
            {available} {item.unit}
          </b>
        </div>
        <div>
          <span>Seller</span>
          <b>{item.seller}</b>
        </div>
        <div>
          <span>Profile fit</span>
          <b>{fit(item, profile)}%</b>
        </div>
      </div>
      <div className="pickup">
        <MapPin />
        <span>
          <b>Pickup area</b>
          <small>{item.place}</small>
        </span>
      </div>
      {item.demo && (
        <div className="notice">
          Seeded demo inventory cannot create a transaction.
        </div>
      )}
      {!item.demo && (
        <Field label={`Amount to reserve (${item.unit})`}>
          <input
            type="number"
            min="1"
            max={available}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
      )}
      {!item.demo && (
        <div className="reserve-total">
          <span>Total</span>
          <b>{money((Number(item.price) || 0) * (Number(quantity) || 0))}</b>
        </div>
      )}
      <button className="button lime full" onClick={reserve} disabled={saving}>
        {saving ? "Reserving…" : item.demo ? "Demo listing" : "Reserve amount"}{" "}
        <ArrowRight />
      </button>
    </div>
  );
}

const SectionTitle = ({ title, text, side }) => (
  <div className="section-title">
    <div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
    {side}
  </div>
);
const PanelHead = ({ title, text, side }) => (
  <div className="panel-head">
    <div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
    {side && <span>{side}</span>}
  </div>
);
const Filters = ({ value, set, workspace = false }) => (
  <div className={`filters ${workspace ? "workspace-filters" : ""}`}>
    {cats.map((x) => (
      <button
        className={value === x ? "active" : ""}
        onClick={() => set(x)}
        key={x}
      >
        {x}
      </button>
    ))}
  </div>
);
const Progress = ({ value }) => (
  <div
    className="progress"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={value}
  >
    <span style={{ width: `${value}%` }} />
  </div>
);
const Metric = ({ icon: Icon, label, value, note }) => (
  <article className="metric">
    <Icon />
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </article>
);
const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);
const Avatar = ({ profile }) =>
  profile?.photoURL ? (
    <img className="avatar" src={profile.photoURL} alt="" />
  ) : (
    <span className="avatar fallback">
      {(profile?.name || "FL").slice(0, 2).toUpperCase()}
    </span>
  );
const Toast = ({ text }) => (
  <div className="toast" role="status">
    <Check />
    {text}
  </div>
);
const Empty = ({ icon: Icon, title, text }) => (
  <div className="empty">
    <Icon />
    <h2>{title}</h2>
    <p>{text}</p>
  </div>
);
const Loading = () => (
  <div className="loading" role="status" aria-label="Loading content">
    <i />
    <i />
    <i />
    <i />
  </div>
);
function Drawer({ title, sub, close, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  const titleId = `drawer-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div
      className="drawer-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <div>
            <span>{sub}</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            aria-label={`Close ${title}`}
            className="icon-btn"
            onClick={close}
          >
            <X />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
function Notifications({ region, close }) {
  return (
    <div
      className="notifications"
      role="region"
      aria-label="Illustrative network signals"
    >
      <header>
        <h2>Network signals</h2>
        <button
          aria-label="Close network signals"
          className="icon-btn"
          onClick={close}
        >
          <X />
        </button>
      </header>
      {[
        ["NEW NEARBY", `80 kg tomatoes near ${region}`],
        ["GROUP BUY", "Cooking oil pool reached minimum"],
        ["DEMAND PLAN", "Fresh produce restock window"],
      ].map((x) => (
        <div key={x[0]}>
          <span>{x[0]}</span>
          <b>{x[1]}</b>
          <small>Illustrative signal</small>
        </div>
      ))}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
