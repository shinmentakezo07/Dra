"use client";

import { useState } from "react";
import { Building2, Users, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
}

export default function OrganizationPage() {
  const [orgName, setOrgName] = useState("My Organization");
  const [members, setMembers] = useState<Member[]>([
    { id: "1", name: "You", email: "you@example.com", role: "owner" },
  ]);
  const [newEmail, setNewEmail] = useState("");

  const addMember = () => {
    if (!newEmail) return;
    const member: Member = {
      id: `member_${Date.now()}`,
      name: newEmail.split("@")[0],
      email: newEmail,
      role: "member",
    };
    setMembers((prev) => [...prev, member]);
    setNewEmail("");
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-white">Organization</h1>
      </div>

      {/* Org Info */}
      <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Organization Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full max-w-md bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </section>

      {/* Members */}
      <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Members</h2>
            <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded-full">
              {members.length}
            </span>
          </div>
        </div>

        {/* Add Member */}
        <div className="flex gap-2 mb-4">
          <input
            type="email"
            placeholder="member@company.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMember()}
            className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-primary"
          />
          <button
            onClick={addMember}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite
          </button>
        </div>

        {/* Member List */}
        <div className="space-y-2">
          {members.map((member) => (
            <motion.div
              key={member.id}
              layout
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div>
                <p className="text-white text-sm font-medium">{member.name}</p>
                <p className="text-gray-500 text-xs">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    member.role === "owner"
                      ? "bg-primary/20 text-primary"
                      : member.role === "admin"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {member.role}
                </span>
                {member.role !== "owner" && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
