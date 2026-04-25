import { LandingPage } from "@/components/landing/landing-page";
import { getLandingData } from "@/lib/db/landing";

export default async function Home() {
  const data = await getLandingData();

  return <LandingPage data={data} />;
}
