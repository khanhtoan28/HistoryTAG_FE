import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import PageMeta from "../components/common/PageMeta";

interface UserProfilesProps {
  isSuperAdmin?: boolean;
}

export default function UserProfiles({ isSuperAdmin = false }: UserProfilesProps) {
  return (
    <>
      <PageMeta
        title="Thông tin cá nhân"
        description=""
      />
      <PageBreadcrumb pageTitle="Thông tin cá nhân" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="space-y-6">
          <UserMetaCard />
          <UserInfoCard isSuperAdmin={isSuperAdmin} />
        </div>
      </div>
    </>
  );
}
