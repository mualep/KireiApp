import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kebijakan Privasi (Privacy Policy) | KireiApp",
  description: "Kebijakan Privasi dan Perlindungan Data Platform Kireiku.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between border-b border-border/60 pb-6">
          <Link
            href="/"
            className="text-xl font-black tracking-tight hover:opacity-80 transition-opacity"
            translate="no"
          >
            Kireiku<span className="text-primary">.</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/" className="flex items-center gap-1.5">
              <ChevronLeft className="size-4" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>

        <article className="prose prose-neutral dark:prose-invert max-w-none flex flex-col gap-6 text-foreground/90">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-heading">
              Kebijakan Privasi
            </h1>
            <p className="text-xs text-muted-foreground">
              Terakhir diperbarui: 21 Agustus 2026
            </p>
          </header>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              1. Pengumpulan Data
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kami mengumpulkan informasi yang Anda berikan secara langsung saat berinteraksi dengan platform kami, seperti nama profil, email akun resmi, riwayat pesanan, serta data kehadiran dan produktivitas internal bagi staf dan pekerja.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              2. Penggunaan Data
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Data yang dikumpulkan hanya digunakan untuk:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed text-muted-foreground space-y-1.5">
              <li>Memproses dan menyelesaikan pesanan layanan secara efisien dan tepat waktu.</li>
              <li>Mengelola otentikasi akun, peran wewenang (RBAC), dan operasional shift internal.</li>
              <li>Meningkatkan kualitas antarmuka dan kestabilan performa sistem secara berkelanjutan.</li>
              <li>Keperluan audit keamanan dan pencatatan kepatuhan operasional internal.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              3. Perlindungan & Keamanan Data
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kami menerapkan standar enkripsi TLS terkini, Row-Level Security (RLS) pada basis data PostgreSQL Supabase, dan kebijakan sandi terenkripsi (Argon2id/Bcrypt) untuk memastikan informasi Anda selalu terlindungi dari akses tanpa izin.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              4. Berbagi Data dengan Pihak Ketiga
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kireiku tidak menjual, menyewakan, atau memperdagangkan data pribadi pengguna kepada pihak ketiga mana pun. Data hanya dibagikan kepada penyedia infrastruktur terpercaya (seperti Supabase dan Upstash) untuk keperluan pemrosesan fungsional sistem semata.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              5. Hak Akses dan Pembaruan Data
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pengguna dan anggota tim berhak untuk meminta peninjauan, pembaruan, atau penghapusan data pribadi mereka sesuai dengan regulasi perlindungan data yang berlaku, dengan menghubungi pihak pengelola Kireiku.
            </p>
          </section>
        </article>

        <footer className="border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Kireiku. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
