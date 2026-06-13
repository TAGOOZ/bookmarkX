import React from 'react';

interface NavPanelUserProps {
  userName: string;
  isExpanded: boolean;
}

const NavPanelUser: React.FC<NavPanelUserProps> = ({ userName, isExpanded }) => {
  if (!userName) return null;

  if (!isExpanded) {
    return (
      <div className="nav-panel-collapsed-avatar" title={userName}>
        <div className="nav-panel-user-avatar">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className="nav-panel-user">
      <div className="nav-panel-user-avatar">
        {userName.charAt(0).toUpperCase()}
      </div>
      <span className="nav-panel-user-name">{userName}</span>
    </div>
  );
};

export default NavPanelUser;
