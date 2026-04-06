import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { supabase } from "../../lib/supabase";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="animated-auth-google-mark">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.48a5.55 5.55 0 0 1-2.4 3.65v3h3.88c2.27-2.09 3.56-5.17 3.56-8.68Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3c-1.08.73-2.46 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.92H1.3v3.09A11.98 11.98 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.34A7.18 7.18 0 0 1 4.94 12c0-.81.14-1.59.37-2.34V6.57H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.43l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.78l3.44-3.44C17.94 1.14 15.23 0 12 0 7.31 0 3.27 2.69 1.3 6.57l4.01 3.09c.94-2.82 3.58-4.89 6.69-4.89Z"
      />
    </svg>
  );
}

function AnimatedSignIn() {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function validateEmail(nextEmail) {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(nextEmail).toLowerCase());
  }

  function handleEmailChange(event) {
    const nextEmail = event.target.value;
    setEmail(nextEmail);
    setIsEmailValid(nextEmail ? validateEmail(nextEmail) : true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsFormSubmitted(true);
    setMessage("");

    if (!email || !password || !validateEmail(email)) {
      return;
    }

    setSubmitting(true);

    try {
      if (!supabase) {
        throw new Error("Supabase auth is not configured.");
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            setMessage("Account created. Check your email if confirmation is enabled.");
          }
        }
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setSubmitting(true);
    setMessage("");

    try {
      if (!supabase) {
        throw new Error("Supabase auth is not configured.");
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setMessage(error.message || "Google sign-in failed.");
      setSubmitting(false);
    }
  }

  function toggleTheme() {
    setIsDarkMode((current) => !current);
  }

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDarkMode(prefersDark);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = isDarkMode ? "dark" : "light";
    root.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    class Particle {
      constructor() {
        this.reset();
        this.size = Math.random() * 2.2 + 0.8;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.speedX = (Math.random() - 0.5) * 0.38;
        this.speedY = (Math.random() - 0.5) * 0.38;
        this.alpha = Math.random() * 0.22 + 0.05;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width + 10) this.x = -10;
        if (this.x < -10) this.x = canvas.width + 10;
        if (this.y > canvas.height + 10) this.y = -10;
        if (this.y < -10) this.y = canvas.height + 10;
      }

      draw() {
        ctx.fillStyle = isDarkMode ? `rgba(231, 240, 249, ${this.alpha})` : `rgba(18, 52, 86, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const particles = Array.from(
      { length: Math.min(96, Math.floor((canvas.width * canvas.height) / 18000)) },
      () => new Particle()
    );

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const particle of particles) {
        particle.update();
        particle.draw();
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDarkMode]);

  return (
    <div className={`animated-auth-shell ${isDarkMode ? "is-dark" : "is-light"}`}>
      <canvas ref={canvasRef} className="animated-auth-particles" />

      <button className="animated-auth-theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle theme">
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="animated-auth-card">
        <div className="animated-auth-card-inner">
          <div className="animated-auth-header">
            <div className="animated-auth-brand">
              <img className="animated-auth-brand-icon" src="/pathfinder-icon.svg" alt="Pathfinder logo" />
              <p className="eyebrow">Pathfinder</p>
              <h1>{mode === "signin" ? "Welcome" : "Create account"}</h1>
            </div>
            <p className="muted">
              {mode === "signin" ? "Please sign in to continue" : "Create your account to save schools"}
            </p>
          </div>

          <form className="animated-auth-form" onSubmit={handleSubmit}>
            <div
              className={`animated-auth-field ${isEmailFocused || email ? "is-active" : ""} ${
                !isEmailValid && email ? "is-invalid" : ""
              }`}
            >
              <input
                type="email"
                id="animated-email"
                value={email}
                onChange={handleEmailChange}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                required
              />
              <label htmlFor="animated-email">Email Address</label>
              {!isEmailValid && email ? <span className="animated-auth-error">Please enter a valid email</span> : null}
            </div>

            <div className={`animated-auth-field ${isPasswordFocused || password ? "is-active" : ""}`}>
              <input
                type={showPassword ? "text" : "password"}
                id="animated-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                minLength={8}
                required
              />
              <label htmlFor="animated-password">Password</label>
              <button
                type="button"
                className="animated-auth-toggle-password"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="animated-auth-options">
              <label className="animated-auth-remember">
                <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe((current) => !current)} />
                <span>Remember me</span>
              </label>
              <button type="button" className="link-button animated-auth-forgot">
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="primary-button animated-auth-submit"
              disabled={submitting || (isFormSubmitted && (!email || !password || !isEmailValid))}
            >
              {submitting ? "Working..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="animated-auth-divider">
            <span>or continue with</span>
          </div>

          <div className="animated-auth-socials">
            <button
              className="animated-auth-social-button"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              aria-label="Continue with Google"
              title="Continue with Google"
            >
              <GoogleMark />
            </button>
          </div>

          <p className="animated-auth-switch-copy">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="link-button animated-auth-switch-button"
              onClick={() => {
                setMode((current) => (current === "signin" ? "signup" : "signin"));
                setMessage("");
                setIsFormSubmitted(false);
              }}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>

          {message ? <p className="auth-message">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default AnimatedSignIn;
