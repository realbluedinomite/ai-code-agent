import { useQuery, useMutation, useQueryClient } from 'react-query';
import { postsService } from '../services/api';
import { FilterOptions, Post } from '../types';
import { usePostsStore } from '../store';

export const usePosts = (filters?: FilterOptions) => {
  return useQuery(
    ['posts', filters],
    () => postsService.getPosts(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      keepPreviousData: true
    }
  );
};

export const usePost = (id: string) => {
  return useQuery(
    ['post', id],
    () => postsService.getPost(id),
    {
      enabled: !!id,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (postData: Partial<Post>) => postsService.createPost(postData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('posts');
      },
    }
  );
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, updates }: { id: string; updates: Partial<Post> }) =>
      postsService.updatePost(id, updates),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('posts');
        queryClient.invalidateQueries(['post', variables.id]);
      },
    }
  );
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (id: string) => postsService.deletePost(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('posts');
      },
    }
  );
};

export const usePublishPost = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (id: string) => postsService.publishPost(id),
    {
      onSuccess: (_, id) => {
        queryClient.invalidateQueries('posts');
        queryClient.invalidateQueries(['post', id]);
      },
    }
  );
};
