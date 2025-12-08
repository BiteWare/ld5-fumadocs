import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">LeadDesk 5 Documentation</h1>
      <p className="text-lg text-gray-600 mb-8">Dental practice data enrichment platform</p>
      <Link href="/docs" className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600">
        View Docs
      </Link>
    </main>
  );
}
