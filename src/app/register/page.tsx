"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../login/login.css";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Mahasiswa" | "Dosen">("Mahasiswa");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // ==========================================
      // VALIDASI
      // ==========================================

      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      if (!trimmedName) {
        setError("Nama wajib diisi.");
        return;
      }

      if (!trimmedEmail) {
        setError("Email wajib diisi.");
        return;
      }

      if (password.length < 6) {
        setError("Password minimal 6 karakter.");
        return;
      }

      // ==========================================
      // REGISTER SUPABASE AUTH
      // ==========================================

      const { data, error: signError } =
        await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
        });

      // ==========================================
      // CEK ERROR AUTH
      // ==========================================

      if (signError) {
        console.error("Gagal register Auth:", {
          message: signError.message,
          status: signError.status,
          name: signError.name,
        });

        setError(signError.message);
        return;
      }

      // ==========================================
      // CEK USER
      // ==========================================

      const user = data.user;

      if (!user) {
        setError("Gagal membuat akun. Silakan coba lagi.");
        return;
      }

      console.log("Auth user berhasil dibuat:", user.id);

      // ==========================================
      // MAHASISWA
      // ==========================================

      if (role === "Mahasiswa") {
        console.log("Membuat data mahasiswa...");

        const { data: mhs, error: mhsErr } = await supabase
          .from("mahasiswa")
          .insert({
            nama_mahasiswa: trimmedName,
          })
          .select("id_mahasiswa")
          .single();

        // ------------------------------------------
        // CEK ERROR MAHASISWA
        // ------------------------------------------

        if (mhsErr) {
          console.error("Gagal buat mahasiswa:", {
            message: mhsErr.message,
            details: mhsErr.details,
            hint: mhsErr.hint,
            code: mhsErr.code,
          });

          setError(
            `Gagal membuat profil mahasiswa: ${mhsErr.message}`
          );

          return;
        }

        if (!mhs) {
          console.error("Data mahasiswa kosong.");

          setError("Data mahasiswa gagal dibuat.");

          return;
        }

        console.log(
          "Mahasiswa berhasil dibuat:",
          mhs.id_mahasiswa
        );

        // ==========================================
        // BUAT USER UNTUK MAHASISWA
        // ==========================================

        const { data: userRow, error: userErr } =
          await supabase
            .from("user")
            .insert({
              auth_user_id: user.id,

              // Relasi mahasiswa
              id_mahasiswa: mhs.id_mahasiswa,

              // Yang bukan mahasiswa = NULL
              id_dosen: null,
              id_admin: null,

              // Status aktif
              is_aktif: true,
            })
            .select()
            .single();

        // ------------------------------------------
        // CEK ERROR USER
        // ------------------------------------------

        if (userErr) {
          console.error("Gagal buat user row:", {
            message: userErr.message,
            details: userErr.details,
            hint: userErr.hint,
            code: userErr.code,
          });

          setError(
            `Gagal menyimpan data user: ${userErr.message}`
          );

          return;
        }

        console.log(
          "User mahasiswa berhasil dibuat:",
          userRow
        );
      }

      // ==========================================
      // DOSEN
      // ==========================================

      else if (role === "Dosen") {
        console.log("Membuat data dosen...");

        const { data: dosen, error: dosenErr } =
          await supabase
            .from("dosen")
            .insert({
              nama_dosen: trimmedName,
            })
            .select("id_dosen")
            .single();

        // ------------------------------------------
        // CEK ERROR DOSEN
        // ------------------------------------------

        if (dosenErr) {
          console.error("Gagal buat dosen:", {
            message: dosenErr.message,
            details: dosenErr.details,
            hint: dosenErr.hint,
            code: dosenErr.code,
          });

          setError(
            `Gagal membuat profil dosen: ${dosenErr.message}`
          );

          return;
        }

        if (!dosen) {
          console.error("Data dosen kosong.");

          setError("Data dosen gagal dibuat.");

          return;
        }

        console.log(
          "Dosen berhasil dibuat:",
          dosen.id_dosen
        );

        // ==========================================
        // BUAT USER UNTUK DOSEN
        // ==========================================

        const { data: userRow, error: userErr } =
          await supabase
            .from("user")
            .insert({
              auth_user_id: user.id,

              // Bukan mahasiswa
              id_mahasiswa: null,

              // Relasi dosen
              id_dosen: dosen.id_dosen,

              // Bukan admin
              id_admin: null,

              // Status aktif
              is_aktif: true,
            })
            .select()
            .single();

        // ------------------------------------------
        // CEK ERROR USER
        // ------------------------------------------

        if (userErr) {
          console.error("Gagal buat user row:", {
            message: userErr.message,
            details: userErr.details,
            hint: userErr.hint,
            code: userErr.code,
          });

          setError(
            `Gagal menyimpan data user: ${userErr.message}`
          );

          return;
        }

        console.log(
          "User dosen berhasil dibuat:",
          userRow
        );
      }

      // ==========================================
      // REGISTER BERHASIL
      // ==========================================

      console.log("Registrasi berhasil.");

      alert(
        "Registrasi berhasil! Silakan login menggunakan akun yang telah dibuat."
      );

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

        {/* ======================================
            ILUSTRASI
        ====================================== */}

        <div className="login-illustration">
          <img
            src="/images/board-logo.png"
            alt="logo"
            className="illustration-img"
          />
        </div>

        {/* ======================================
            FORM
        ====================================== */}

        <div className="login-form-side">

          <h1 className="login-title">
            Register
          </h1>

          <form
            onSubmit={handleRegister}
            className="login-form"
          >

            {/* ==================================
                NAMA
            ================================== */}

            <div className="login-field">
              <label htmlFor="name">
                Nama
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Masukkan nama"
                required
              />
            </div>

            {/* ==================================
                EMAIL
            ================================== */}

            <div className="login-field">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Masukkan email"
                required
              />
            </div>

            {/* ==================================
                PASSWORD
            ================================== */}

            <div className="login-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
              />
            </div>

            {/* ==================================
                ROLE
            ================================== */}

            <div className="login-field">
              <label htmlFor="role">
                Role
              </label>

              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value as
                      | "Mahasiswa"
                      | "Dosen"
                  )
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="Mahasiswa">
                  Mahasiswa
                </option>

                <option value="Dosen">
                  Dosen
                </option>
              </select>
            </div>

            {/* ==================================
                ERROR
            ================================== */}

            {error && (
              <p className="login-error">
                {error}
              </p>
            )}

            {/* ==================================
                BUTTON REGISTER
            ================================== */}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Memproses..."
                : "Register"}
            </button>

            {/* ==================================
                DIVIDER
            ================================== */}

            <div className="login-divider">
              <span>atau</span>
            </div>

            {/* ==================================
                LOGIN LINK
            ================================== */}

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