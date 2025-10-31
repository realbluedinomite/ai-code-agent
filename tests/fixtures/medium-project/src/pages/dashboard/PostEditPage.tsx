import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { postsService } from '../../services/api';
import { Button } from '../../components/common/Button';
import toast from 'react-hot-toast';

export const PostEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: postData, isLoading, error } = useQuery(
    ['post', id],
    () => postsService.getPost(id!),
    {
      enabled: !!id,
    }
  );

  const updatePostMutation = useMutation(
    (updates: any) => postsService.updatePost(id!, updates),
    {
      onSuccess: () => {
        toast.success('Post updated successfully!');
        queryClient.invalidateQueries(['post', id]);
        queryClient.invalidateQueries('posts');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update post');
      }
    }
  );

  const deletePostMutation = useMutation(
    () => postsService.deletePost(id!),
    {
      onSuccess: () => {
        toast.success('Post deleted successfully!');
        navigate('/dashboard/posts');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to delete post');
      }
    }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !postData?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Post not found.</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate('/dashboard/posts')}
        >
          Back to Posts
        </Button>
      </div>
    );
  }

  const post = postData.data;

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      deletePostMutation.mutate();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/dashboard/posts')}
        >
          ← Back to Posts
        </Button>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleDelete}
            disabled={deletePostMutation.isLoading}
          >
            Delete
          </Button>
          <Button
            onClick={() => updatePostMutation.mutate({ status: 'published' })}
            disabled={post.status === 'published' || updatePostMutation.isLoading}
          >
            Publish
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Post</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue={post.title}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
              post.status === 'published' 
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {post.status}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Preview
            </label>
            <div className="prose max-w-none p-4 bg-gray-50 rounded-md">
              {post.excerpt}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(post.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span>{' '}
              {new Date(post.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
