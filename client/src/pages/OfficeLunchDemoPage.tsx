export default function OfficeLunchDemoPage() {
  const demoUrl = `/office-lunch-demo/index.html${window.location.search}${window.location.hash}`;

  return (
    <main className="h-dvh w-full overflow-hidden">
      <iframe
        title="Office Lunch Squad demo"
        src={demoUrl}
        allow="autoplay; clipboard-write"
        className="block h-full w-full border-0"
      />
    </main>
  );
}
