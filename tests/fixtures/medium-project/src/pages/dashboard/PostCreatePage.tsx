import React from 'react';
import { PostForm } from '../../components/forms/PostForm';

export const PostCreatePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        <p className="text-gray-600 mt-2">
          Share your thoughts and ideas with the world.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <PostForm />
      </div>
    </div>
  );
};
