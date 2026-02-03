import { useSidebar } from "../context/SidebarContext";

const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <div
      className=""
      onClick={toggleMobileSidebar}
      style={{ zIndex: 40 }}
    />
  );
};

export default Backdrop;
