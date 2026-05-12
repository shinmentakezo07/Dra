import ChatPlayground from "@/components/ChatPlayground";

export default function ChatPage() {
  return (
    <div className="min-h-screen pt-24 px-4 pb-8 relative overflow-hidden">
      {/* Ambient background like the rest of the app */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-60" />
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Dashboard Chat</h1>
        <p className="text-gray-400">
          Your private workspace with Shinmen. Chats are saved in your browser.
        </p>
      </div>

      <ChatPlayground />
    </div>
  );
}
