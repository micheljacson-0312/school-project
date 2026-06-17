import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="text-6xl font-bold text-brand-600">404</div>
      <h1 className="text-2xl font-semibold mt-4">Page not found</h1>
      <p className="text-slate-500 mt-2">The page you were looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex">Back to home</Link>
    </div>
  );
}
