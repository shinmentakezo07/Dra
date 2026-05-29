-- Fine-grained RBAC: permissions table and role_permissions mapping
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    permission_name VARCHAR(100) NOT NULL REFERENCES permissions(name) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role, permission_name)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- Seed default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
    ('users.read', 'View user list and details', 'users', 'read'),
    ('users.write', 'Create, update, delete users', 'users', 'write'),
    ('billing.read', 'View transactions and revenue', 'billing', 'read'),
    ('billing.write', 'Adjust credits, manage billing', 'billing', 'write'),
    ('providers.read', 'View provider configurations', 'providers', 'read'),
    ('providers.write', 'Create, update, delete providers', 'providers', 'write'),
    ('models.read', 'View model registry', 'models', 'read'),
    ('models.write', 'Create, update, delete models', 'models', 'write'),
    ('settings.read', 'View system settings', 'settings', 'read'),
    ('settings.write', 'Update system settings and feature flags', 'settings', 'write'),
    ('security.read', 'View security logs and IP lists', 'security', 'read'),
    ('security.write', 'Manage IP lists and security rules', 'security', 'write'),
    ('audit.read', 'View audit logs', 'audit', 'read'),
    ('audit.export', 'Export audit logs', 'audit', 'export')
ON CONFLICT (name) DO NOTHING;

-- Seed default role-permission mappings
-- superadmin gets all permissions
INSERT INTO role_permissions (role, permission_name)
SELECT 'superadmin', name FROM permissions
ON CONFLICT (role, permission_name) DO NOTHING;

-- admin gets most permissions except security.write
INSERT INTO role_permissions (role, permission_name)
SELECT 'admin', name FROM permissions WHERE name NOT IN ('security.write')
ON CONFLICT (role, permission_name) DO NOTHING;

-- support gets read-only access
INSERT INTO role_permissions (role, permission_name)
SELECT 'support', name FROM permissions WHERE name LIKE '%.read'
ON CONFLICT (role, permission_name) DO NOTHING;

-- analyst gets read + export
INSERT INTO role_permissions (role, permission_name)
SELECT 'analyst', name FROM permissions WHERE name LIKE '%.read' OR name = 'audit.export'
ON CONFLICT (role, permission_name) DO NOTHING;
