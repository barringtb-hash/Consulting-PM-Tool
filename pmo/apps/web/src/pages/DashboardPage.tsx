import { Link } from 'react-router-dom';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { Card, CardBody, CardTitle } from '../ui/Card';

function DashboardPage(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome to your AI Consulting PMO workspace. Track your clients, projects, tasks, and AI assets."
      />
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <CardTitle className="mb-4">Quick Links</CardTitle>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/clients"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    View Clients
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tasks"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    My Tasks
                  </Link>
                </li>
                <li>
                  <Link
                    to="/assets"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    Asset Library
                  </Link>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </Section>
    </>
  );
}

export default DashboardPage;
