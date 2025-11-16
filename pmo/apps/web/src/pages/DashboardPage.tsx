import { Link } from 'react-router-dom';

function DashboardPage(): JSX.Element {
  return (
    <section>
      <h1>Dashboard</h1>
      <p>
        Welcome to the AI Consulting PMO dashboard. Use the navigation to access
        your workspace.
      </p>
      <ul>
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>
      </ul>
    </section>
  );
}

export default DashboardPage;
