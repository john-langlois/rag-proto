"use client";

export default function DefaultChatPage() {
  return (
    <div className="flex-1 flex items-center justify-center flex-col gap-4">
      <svg
        className="opacity-10"
        width="150px"
        height="150px"
        version="1.1"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path d="m77.082 39.582h-29.164c-3.543 0-6.25 2.707-6.25 6.25v16.668c0 3.332 2.707 6.25 6.25 6.25h20.832l8.332 8.332v-8.332c3.543 0 6.25-2.918 6.25-6.25v-16.668c0-3.5391-2.707-6.25-6.25-6.25z" />
          <path d="m52.082 25h-29.164c-3.543 0-6.25 2.707-6.25 6.25v16.668c0 3.332 2.707 6.25 6.25 6.25v8.332l8.332-8.332h6.25v-8.332c0-5.832 4.582-10.418 10.418-10.418h10.418v-4.168c-0.003907-3.543-2.7109-6.25-6.2539-6.25z" />
        </g>
      </svg>
      <div className="text-gray-500 text-center">
        <p>Select a chat from the sidebar</p>
        <p>or create a new one to get started</p>
      </div>
    </div>
  );
}
