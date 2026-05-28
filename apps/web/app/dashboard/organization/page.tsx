"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useOrganizations,
  useCreateOrganization,
  useOrgMembers,
  useInviteMember,
  useRemoveMember,
} from "@/lib/api/hooks";

type MemberRole = "owner" | "admin" | "member";

export default function OrganizationPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: organizations = [], isLoading: loadingOrgs } =
    useOrganizations();
  const { mutate: createOrg, isPending: creatingOrg } = useCreateOrganization();
  const { data: members = [], isLoading: loadingMembers } = useOrgMembers(
    selectedOrgId ?? "",
  );
  const { mutate: inviteMember, isPending: inviting } = useInviteMember();
  const { mutate: removeMember, isPending: removing } = useRemoveMember();

  const selectedOrg =
    organizations.find((o) => o.id === selectedOrgId) ??
    organizations[0] ??
    null;

  const handleCreateOrg = () => {
    if (!newOrgName.trim()) return;
    createOrg(
      { name: newOrgName.trim() },
      {
        onSuccess: (org) => {
          setSelectedOrgId(org.id);
          setNewOrgName("");
          setShowCreateOrg(false);
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  const handleInvite = () => {
    if (!newEmail.trim() || !selectedOrg) return;
    inviteMember(
      { orgId: selectedOrg.id, data: { email: newEmail.trim() } },
      {
        onSuccess: () => setNewEmail(""),
        onError: (err) => setError(err.message),
      },
    );
  };

  const handleRemoveMember = (userId: string) => {
    if (!selectedOrg) return;
    removeMember(
      { orgId: selectedOrg.id, userId },
      { onError: (err) => setError(err.message) },
    );
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-white">Organization</h1>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Organization Selector */}
      <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Organizations</h2>

        {loadingOrgs ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedOrg?.id === org.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {org.name}
                </button>
              ))}
              <button
                onClick={() => setShowCreateOrg(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-400 border border-dashed border-white/20 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>

            <AnimatePresence>
              {showCreateOrg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 pt-2"
                >
                  <input
                    type="text"
                    placeholder="Organization name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
                    className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-primary"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateOrg}
                    disabled={creatingOrg}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {creatingOrg ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateOrg(false);
                      setNewOrgName("");
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Members */}
      {selectedOrg && (
        <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Members</h2>
              <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded-full">
                {members.length}
              </span>
            </div>
            <span className="text-xs text-gray-600 font-mono">
              {selectedOrg.name}
            </span>
          </div>

          {/* Add Member */}
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              placeholder="member@company.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {inviting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Invite
            </button>
          </div>

          {/* Member List */}
          <div className="space-y-2">
            {loadingMembers ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading members...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">
                No members yet. Invite someone to get started.
              </div>
            ) : (
              members.map((member) => (
                <motion.div
                  key={member.userId}
                  layout
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {member.name}
                    </p>
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
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={removing}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      >
                        {removing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
