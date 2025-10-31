import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Post, User } from '../../types';
import { Card } from '../common/Card';

interface PostCardProps {
  post: Post;
  author?: User;
  showExcerpt?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  author,
  showExcerpt = true 
}) => {
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const displayAuthor = author || post.author;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          {displayAuthor?.avatar ? (
            <img
              src={displayAuthor.avatar}
              alt={`${displayAuthor.firstName} ${displayAuthor.lastName}`}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {displayAuthor?.firstName?.charAt(0) || 'A'}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {displayAuthor ? `${displayAuthor.firstName} ${displayAuthor.lastName}` : 'Anonymous'}
            </p>
            <p className="text-xs text-gray-500">{timeAgo}</p>
          </div>
        </div>

        {/* Content */}
        <Link to={`/posts/${post.id}`} className="block group">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
            {post.title}
          </h3>
          
          {showExcerpt && (
            <p className="text-gray-600 mb-4 line-clamp-3">
              {post.excerpt}
            </p>
          )}
        </Link>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center space-x-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>24</span>
            </span>
            <span className="flex items-center space-x-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>12</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              post.status === 'published' 
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {post.status}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
