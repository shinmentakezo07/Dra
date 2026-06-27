"use client";

import { motion } from "framer-motion";
import { Users, Shield, Mail, UserPlus } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function OrganizationsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section
        id="organizations"
        icon={Users}
        title="Organizations"
        accent="amber"
      >
        <p>
          Organizations enable teams to collaborate with shared resources, API
          keys, and credit pools. Each organization has an owner (creator) who
          can invite members, manage roles, and control access. Members share
          the organization's credits and can use its API keys.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[
            {
              title: "Shared Credits",
              icon: Shield,
              desc: "All organization members draw from a common credit balance. Track spending per member.",
            },
            {
              title: "Role Management",
              icon: Users,
              desc: "Owners and admins can manage members, invite collaborators, and remove users.",
            },
            {
              title: "Invite by Email",
              icon: Mail,
              desc: "Send email invitations with magic links. New members accept and join automatically.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.07] hover:border-white/[0.1] transition-all duration-200"
            >
              <item.icon className="w-5 h-5 text-blue-400 mb-3" />
              <h3 className="text-white font-semibold text-sm mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Organization Model
        </h3>
        <p className="text-sm text-white/50 leading-relaxed mb-4">
          Each organization has the following structure:
        </p>
        <CodeBlock
          language="json"
          code={`{
  "id": "org_abc123",
  "name": "My Team",
  "ownerId": "usr_def456",
  "plan": "free",
  "createdAt": "2026-05-13T10:00:00Z"
}`}
        />

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Managing Organizations
        </h3>
        <div className="space-y-2">
          <EndpointCard
            method="GET"
            path="/api/organizations"
            description="List all organizations you own or are a member of. Returns both owned and joined organizations, deduplicated by ID."
          />
          <EndpointCard
            method="POST"
            path="/api/organizations"
            description="Create a new organization. You become the owner with admin role. Name must be at least 2 characters."
          >
            <CodeBlock
              language="json"
              code={`curl -X POST ${BASE_URL}/api/organizations \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "name": "My Engineering Team"
  }'`}
            />
          </EndpointCard>
          <EndpointCard
            method="GET"
            path="/api/organizations/{id}"
            description="Get organization details including name, owner, plan tier, and creation date."
          />
          <EndpointCard
            method="GET"
            path="/api/organizations/{id}/members"
            description="List all members with their user IDs, roles, and join dates."
          >
            <CodeBlock
              language="json"
              code={`// Response
[
  {
    "id": "mem_001",
    "orgId": "org_abc123",
    "userId": "usr_def456",
    "role": "admin",
    "joinedAt": "2026-05-13T10:00:00Z"
  },
  {
    "id": "mem_002",
    "orgId": "org_abc123",
    "userId": "usr_ghi789",
    "role": "member",
    "joinedAt": "2026-05-13T11:00:00Z"
  }
]`}
            />
          </EndpointCard>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Members & Invitations
        </h3>

        <div className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.07] mb-6">
          <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            Invitation Flow
          </h4>
          <ol className="space-y-3 text-sm text-white/30">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-500/[0.08] flex items-center justify-center text-blue-400 text-[10px] font-bold font-mono">
                1
              </span>
              <span>
                Admin calls{" "}
                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
                  POST /api/organizations/{"{id}"}/invite
                </code>{" "}
                with the invitee&apos;s email and role.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-500/[0.08] flex items-center justify-center text-blue-400 text-[10px] font-bold font-mono">
                2
              </span>
              <span>
                System creates an invitation with a unique token and sends an
                email with the accept link (if SMTP is configured).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-500/[0.08] flex items-center justify-center text-blue-400 text-[10px] font-bold font-mono">
                3
              </span>
              <span>
                The invitee calls{" "}
                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
                  POST /api/invites/accept
                </code>{" "}
                with the token to join the organization.
              </span>
            </li>
          </ol>
        </div>

        <div className="space-y-2">
          <EndpointCard
            method="POST"
            path="/api/organizations/{id}/invite"
            description="Invite a user by email with a specific role. An invitation email is sent if SMTP is configured. Returns the invite with a unique token."
          >
            <CodeBlock
              language="json"
              code={`curl -X POST ${BASE_URL}/api/organizations/{orgId}/invite \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "email": "colleague@example.com",
    "role": "member"
  }'`}
            />
          </EndpointCard>
          <EndpointCard
            method="POST"
            path="/api/invites/accept"
            description="Accept a pending organization invitation using the token from the invite email."
          >
            <CodeBlock
              language="json"
              code={`curl -X POST ${BASE_URL}/api/invites/accept \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "token": "invite_token_from_email"
  }'`}
            />
          </EndpointCard>
          <EndpointCard
            method="POST"
            path="/api/organizations/{id}/members/{userId}"
            description="Remove a member from the organization. Only admins can remove members. The owner cannot be removed."
          />
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Roles & Permissions
        </h3>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                  Invite Members
                </th>
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                  Remove Members
                </th>
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                  Use Credits
                </th>
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                  Delete Org
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                {
                  role: "Owner",
                  invite: "Yes",
                  remove: "Yes",
                  use: "Yes",
                  delete: "Yes",
                },
                {
                  role: "Admin",
                  invite: "Yes",
                  remove: "Yes",
                  use: "Yes",
                  delete: "No",
                },
                {
                  role: "Member",
                  invite: "No",
                  remove: "No",
                  use: "Yes",
                  delete: "No",
                },
              ].map((row) => (
                <tr
                  key={row.role}
                  className="text-white/40 text-xs hover:bg-white/[0.01] transition-colors"
                >
                  <td className="py-3 px-4 text-white font-medium">
                    {row.role}
                  </td>
                  <td className="py-3 px-4">{row.invite}</td>
                  <td className="py-3 px-4">{row.remove}</td>
                  <td className="py-3 px-4">{row.use}</td>
                  <td className="py-3 px-4">{row.delete}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TipBox>
          Organization credits and API keys are separate from your personal
          account. When you create or join an organization, switch between
          contexts in the dashboard to access shared resources. Only the owner
          can delete an organization.
        </TipBox>
      </Section>
    </motion.div>
  );
}
