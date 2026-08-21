import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan (Terms of Service) | KireiApp",
  description: "Syarat dan Ketentuan Penggunaan Layanan dan Platform Kireiku.",
};

export default function TermsPage() {
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
              Syarat dan Ketentuan Layanan
            </h1>
            <p className="text-xs text-muted-foreground">
              Terakhir diperbarui: 21 Agustus 2026
            </p>
          </header>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              1. Ketentuan Umum
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Selamat datang di Kireiku. Dengan mengakses atau menggunakan platform kami, Anda menyetujui untuk terikat dengan Syarat dan Ketentuan ini. Jika Anda tidak menyetujui salah satu bagian dari ketentuan ini, Anda dipersilakan untuk tidak menggunakan layanan kami.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              2. Layanan Gaming & Booster
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kireiku menyediakan jasa bantuan game (gaming booster, leveling, dan pendampingan) profesional secara legal dan terpercaya. Seluruh transaksi resmi diproses melalui kanal resmi dan platform pihak ketiga terpercaya (seperti G2G).
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              3. Hak dan Kewajiban Pengguna
            </h2>
            <ul className="list-disc pl-5 text-sm leading-relaxed text-muted-foreground space-y-1.5">
              <li>Pengguna wajib memberikan informasi yang akurat dan dapat dipertanggungjawabkan saat melakukan pemesanan.</li>
              <li>Pengguna dilarang menyalahgunakan akun, melakukan tindakan curang, atau merusak integritas sistem Kireiku.</li>
              <li>Pengguna bertanggung jawab penuh atas keamanan kredensial akun pihak ketiga milik pengguna sendiri.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              4. Tata Tertib Operasional & Tim Internal
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Seluruh pekerja, pemain, dan staf internal Kireiku terikat oleh Peraturan Perusahaan (Enterprise Rules) yang berlaku, mencakup tata tertib shift kerja, standar performa, dan kerahasiaan data operasional.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              5. Batasan Tanggung Jawab
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kireiku berupaya semaksimal mungkin memberikan layanan dengan uptime tinggi dan kualitas terbaik. Namun, kami tidak bertanggung jawab atas kerugian tidak langsung atau gangguan teknis yang disebabkan oleh pihak ketiga di luar kendali wajar kami.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              6. Hubungi Kami
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Untuk pertanyaan atau klarifikasi lebih lanjut mengenai syarat dan ketentuan ini, silakan hubungi tim administrasi Kireiku melalui kontak resmi yang tersedia di platform.
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
