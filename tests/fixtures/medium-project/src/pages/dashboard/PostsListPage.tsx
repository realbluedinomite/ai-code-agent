import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '../../hooks/usePosts';
import { FilterOptions } from '../../types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { PostCard } from '../../components/listings/PostCard';

export const PostsListPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({});
  const { data: postsData, isLoading, error } = usePosts(filters);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading posts. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-600 mt-2">
            Manage all your blog posts in one place.
          </p>
        </div>
        <Link to="/dashboard/posts/new">
          <Button>Create New Post</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search posts..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          
          <select
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={filters.sortBy || ''}
            onChange={(e) => handleFilterChange('sortBy', e.target.value || undefined)}
          >
            <option value="">Sort By</option>
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Updated Date</option>
            <option value="title">Title</option>
          </select>

          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : postsData?.data && postsData.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {postsData.data.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No posts found.</p>
          <Link to="/dashboard/posts/new">
            <Button>Create Your First Post</Button>
          </Link>
        </div>
      )}
    </div>
  );
};
