"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../login/login.css";

type Role = "Mahasiswa" | "Dosen";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Mahasiswa");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Bersihkan nama
      const cleanName = name.trim();

      // Bersihkan email dari spasi
      // Contoh:
      // " dosen123@gmail.com " -> "dosen123@gmail.com"
      let cleanEmail = email.trim();

      // Jika yang terpaste adalah:
      // [dosen123@gmail.com](mailto:dosen123@gmail.com)
      // ambil hanya alamat emailnya
      const markdownEmailMatch = cleanEmail.match(
        /^\[([^\]]+)\]\(mailto:[^)]+\)$/i
      );

      if (markdownEmailMatch) {
        cleanEmail = markdownEmailMatch[1].trim();
      }

      // Jika terpaste:
      // mailto:dosen123@gmail.com
      cleanEmail = cleanEmail.replace(/^mailto:/i, "");

      // Ubah ke lowercase
      cleanEmail = cleanEmail.toLowerCase();

      // =========================
      // VALIDASI
      // =========================

      if (!cleanName) {
        setError("Nama wajib diisi.");
        return;
      }

      if (!cleanEmail) {
        setError("Email wajib diisi.");
        return;
      }

      // Validasi format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        setError("Format email tidak valid.");
        return;
      }

      if (password.length < 6) {
        setError("Password minimal 6 karakter.");
        return;
      }

      console.log("Email yang dikirim:", cleanEmail);
      console.log("Role:", role);

      // =========================
      // REGISTER SUPABASE AUTH
      // =========================

      const { data, error: signError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              nama: cleanName,
              role,
            },
          },
        });

      // =========================
      // CEK ERROR
      // =========================

      if (signError) {
        console.error("Gagal register:", {
          message: signError.message,
          status: signError.status,
          name: signError.name,
        });

        setError(signError.message);
        return;
      }

      if (!data.user) {
        setError("Gagal membuat akun.");
        return;
      }

      console.log(
        "Registrasi berhasil. Auth User ID:",
        data.user.id
      );

      // =========================
      // BERHASIL
      // =========================

      if (!data.session) {
        alert(
          "Registrasi berhasil. Silakan cek email untuk verifikasi akun."
        );
      } else {
        alert(
          "Registrasi berhasil! Silakan login menggunakan akun Anda."
        );
      }

      router.push("/login");
    } catch (err: unknown) {
      console.error("Error register:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat registrasi.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-illustration">
          <img
            src="/images/board-logo.png"
            alt="Syariah Quest Logo"
            className="illustration-img"
          />
        </div>

        <div className="login-form-side">
          <h1 className="login-title">Register</h1>

          <form
            onSubmit={handleRegister}
            className="login-form"
          >
            {/* NAMA */}
            <div className="login-field">
              <label htmlFor="name">
                Nama
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama"
                required
                disabled={loading}
              />
            </div>

            {/* EMAIL */}
            <div className="login-field">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="contoh@gmail.com"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {/* PASSWORD */}
            <div className="login-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={loading}
              />
            </div>

            {/* ROLE */}
            <div className="login-field">
              <label htmlFor="role">
                Role
              </label>

              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value as Role
                  )
                }
                className="w-full p-2 border rounded-md"
                disabled={loading}
              >
                <option value="Mahasiswa">
                  Mahasiswa
                </option>

                <option value="Dosen">
                  Dosen
                </option>
              </select>
            </div>

            {/* ERROR */}
            {error && (
              <p className="login-error">
                {error}
              </p>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Memproses..."
                : "Register"}
            </button>

            <div className="login-divider">
              <span>atau</span>
            </div>

            <div className="login-links-row">
              <a
                href="/login"
                className="login-link"
              >
                Punya akun? Login
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}