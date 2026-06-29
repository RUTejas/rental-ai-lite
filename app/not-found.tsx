import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <span>404</span>
      <h1>This door doesn’t lead anywhere.</h1>
      <p>The page may have moved, or the address may be incorrect.</p>
      <Link href="/">Return to RentWise</Link>
    </main>
  );
}
