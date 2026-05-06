import { useState } from "react";
import { useLocation } from "react-router-dom";
import RedhotIntro from "./RedhotIntro";
import RedHotStore from "./RedHotStore";
import RedHotAdmin from "./RedHotAdmin";

export default function App() {
  const [introComplete, setIntroComplete] = useState(false);
  const { pathname } = useLocation();
  const isAdmin = pathname === "/admin";

  if (isAdmin) return <RedHotAdmin />;
  if (!introComplete) return <RedhotIntro onComplete={() => setIntroComplete(true)} />;
  return <RedHotStore />;
}