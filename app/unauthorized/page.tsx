import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return <main className="not-found"><ShieldAlert size={44} /><span>ACCESS PROTECTED</span><h1>This portal belongs to another role.</h1><p>Sign in with the correct RentWise account to access its rental records.</p><Link href="/">Return to secure sign in</Link></main>;
}
