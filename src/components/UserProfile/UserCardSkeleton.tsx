import React from 'react';

const UserCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="text-center mb-3">
        {/* Avatar Skeleton */}
        <div className="relative inline-block mb-2">
          <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-300 animate-pulse"></div>
        </div>

        {/* Username and Status Skeleton */}
        <div className="h-5 bg-gray-200 rounded animate-pulse w-24 mx-auto mb-1"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-16 mx-auto mb-2"></div>
      </div>

      {/* User Info Skeleton */}
      <div className="space-y-2 mb-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions Skeleton */}
      <div className="flex justify-center gap-2 pt-3 border-t border-gray-100">
        <div className="w-16 h-6 bg-gray-200 rounded-md animate-pulse"></div>
        <div className="w-16 h-6 bg-gray-200 rounded-md animate-pulse"></div>
        <div className="w-20 h-6 bg-gray-200 rounded-md animate-pulse"></div>
        <div className="w-16 h-6 bg-gray-200 rounded-md animate-pulse"></div>
      </div>
    </div>
  );
};

export default UserCardSkeleton;