import React, { createContext, useContext, useMemo, useState } from 'react';

const PermissionsContext = createContext(null);

const MOCK_USER = {
  id: 1,
  full_name: 'Admin',
  email: 'admin@test.com',
  role: 'admin',
  allowed_projects: [],
};

export function PermissionsProvider({ children }) {
  const [currentUser] = useState(MOCK_USER);
  const [isLoading] = useState(false);

  const value = useMemo(() => {
    const userRole = currentUser?.role || 'viewer';
    const allowedProjects = currentUser?.allowed_projects || [];

    const isAdmin = userRole === 'admin';
    const isSupervisor = userRole === 'supervisor';
    const isViewer = userRole === 'viewer';

    const hasAccessToProject = (projectName) => {
      if (isAdmin) return true;
      return allowedProjects.includes(projectName);
    };

    return {
      currentUser,
      userRole,
      allowedProjects,
      isLoading,
      hasAccessToProject,
      canEditUsers: isAdmin,
      canCreateProjects: isAdmin || isSupervisor,
      canDeleteItems: isAdmin || isSupervisor,
      isAdmin,
      isSupervisor,
      isViewer,
    };
  }, [currentUser, isLoading]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }

  return context;
}