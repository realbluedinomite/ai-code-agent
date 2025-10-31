import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { postsService } from '../../services/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface PostFormData {
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published';
  tags: string;
}

export const PostForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<PostFormData>({
    defaultValues: {
      status: 'draft'
    }
  });

  const createPostMutation = useMutation(
    async (data: PostFormData) => {
      const tagsArray = data.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const postData = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || data.content.substring(0, 200),
        status: data.status,
        tags: tagsArray
      };

      return postsService.createPost(postData);
    },
    {
      onSuccess: () => {
        toast.success('Post created successfully!');
        queryClient.invalidateQueries('posts');
        reset();
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create post');
      }
    }
  );

  const onSubmit = async (data: PostFormData) => {
    setIsSubmitting(true);
    try {
      await createPostMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Title"
        placeholder="Enter post title"
        error={errors.title?.message}
        {...register('title', {
          required: 'Title is required',
          minLength: {
            value: 3,
            message: 'Title must be at least 3 characters'
          },
          maxLength: {
            value: 200,
            message: 'Title must be less than 200 characters'
          }
        })}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <textarea
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Write your post content here..."
          {...register('content', {
            required: 'Content is required',
            minLength: {
              value: 10,
              message: 'Content must be at least 10 characters'
            }
          })}
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Excerpt (optional)
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Brief summary of the post..."
          {...register('excerpt')}
        />
        {errors.excerpt && (
          <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>
        )}
      </div>

      <Input
        label="Tags"
        placeholder="tag1, tag2, tag3"
        helperText="Separate tags with commas"
        error={errors.tags?.message}
        {...register('tags')}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          {...register('status', { required: 'Status is required' })}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        {errors.status && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Creating...' : 'Create Post'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => reset()}
          disabled={isSubmitting}
        >
          Reset
        </Button>
      </div>
    </form>
  );
};
