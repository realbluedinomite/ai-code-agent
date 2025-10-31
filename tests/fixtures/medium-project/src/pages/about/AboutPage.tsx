import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About MediumApp</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            MediumApp is a modern content platform built with React, TypeScript, and a focus
            on user experience. It provides a seamless environment for writers and readers to
            connect and share ideas.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Our Mission
          </h2>
          <p className="text-gray-600 mb-6">
            To create a space where knowledge and creativity can flourish, enabling
            anyone to share their stories and insights with a global audience.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Features
          </h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>Rich text editor with formatting options</li>
            <li>User authentication and profile management</li>
            <li>Post categorization and tagging</li>
            <li>Comment system with nested replies</li>
            <li>Analytics and insights</li>
            <li>Responsive design for all devices</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Technology Stack
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900">Frontend</h3>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>React 18</li>
                <li>TypeScript</li>
                <li>React Router</li>
                <li>React Query</li>
                <li>Zustand</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900">Styling</h3>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>Tailwind CSS</li>
                <li>Headless UI</li>
                <li>React Hook Form</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900">Tools</h3>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>ESLint</li>
                <li>Prettier</li>
                <li>Jest</li>
                <li>React Testing Library</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Team
          </h2>
          <p className="text-gray-600 mb-6">
            MediumApp is built by a passionate team of developers, designers, and
            content creators who believe in the power of sharing knowledge.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Contact Us
          </h2>
          <p className="text-gray-600">
            Have questions or suggestions? We'd love to hear from you. Reach out to us at{' '}
            <a href="mailto:contact@mediumapp.com" className="text-blue-600 hover:underline">
              contact@mediumapp.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
