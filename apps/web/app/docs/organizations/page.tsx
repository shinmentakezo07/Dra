"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { TipBox } from "@/components/docs/TipBox";

export default function OrganizationsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="organizations" icon={Users} title="Organizations">
        <p>
          Organizations enable teams to share API keys, credits, and billing across multiple users.
          Manage membership, invite collaborators, and control access from a single dashboard.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">Managing Organizations</h3>
        <div className="space-y-2">
          <EndpointCard method="GET" path="/api/organizations" description="List all organizations you belong to or manage." />
          <EndpointCard method="POST" path="/api/organizations" description="Create a new organization with a name and optional settings.">
            <div className="text-sm text-muted-foreground mb-3">
              Provide a name and optional settings for your new organization.
            </div>
          </EndpointCard>
          <EndpointCard method="GET" path="/api/organizations/{id}" description="Get organization details including name, member count, and creation date." />
          <EndpointCard method="GET" path="/api/organizations/{id}/members" description="List all members of an organization with their roles." />
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">Members & Invitations</h3>
        <div className="space-y-2">
          <EndpointCard method="POST" path="/api/organizations/{id}/invite" description="Invite a user to your organization by email. They must accept to join." />
          <EndpointCard method="POST" path="/api/organizations/{id}/members/{userId}" description="Remove a member from the organization." />
          <EndpointCard method="POST" path="/api/invites/accept" description="Accept a pending organization invitation." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          {[
            { title: "Shared Credits", desc: "Team members share a common credit pool for API usage." },
            { title: "Role Management", desc: "Admins can manage members; members can use shared resources." },
            { title: "Usage Visibility", desc: "View per-member usage analytics across the organization." },
          ].map((item) => (
            <div key={item.title} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <TipBox>
          Organization credits and API keys are separate from personal ones. Switch between your personal account and organizations in the dashboard.
        </TipBox>
      </Section>
    </motion.div>
  );
}
