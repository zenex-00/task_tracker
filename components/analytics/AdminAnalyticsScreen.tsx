'use client';

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type ProjectMetric = {
  project: string;
  hours: number;
  completed: number;
  inProgress: number;
  tasks: number;
  members: number;
  completedPct: number;
};

type MemberMetric = {
  name: string;
  hours: number;
  completed: number;
};

interface AdminAnalyticsScreenProps {
  projects: ProjectMetric[];
  members: Array<MemberMetric & { inProgress: number; tasks: number; completedPct: number }>;
  totals: {
    hours: number;
    completed: number;
    inProgress: number;
    tasks: number;
    projects: number;
    activeUsers: number;
    weekHours: number;
    previousWeekHours: number;
    completedPct: number;
  };
  trend: Array<{ date: string; label: string; hours: number }>;
}

const pieColors = ['#2f5ef6', '#11a36a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export function AdminAnalyticsScreen({ projects, members, totals, trend }: AdminAnalyticsScreenProps) {
  const hoursDeltaPct = totals.previousWeekHours > 0 ? ((totals.weekHours - totals.previousWeekHours) / totals.previousWeekHours) * 100 : 0;
  const completionData = [
    { name: 'Completed', value: totals.completed },
    { name: 'Remaining', value: Math.max(0, totals.tasks - totals.completed) },
  ];

  return (
    <section className="view active">
      <div className="section-header">
        <div>
          <h2 className="section-title">Team Analytics</h2>
          <p className="section-subtitle">Team-wide project hours and completion progress.</p>
        </div>
      </div>

      <div className="metric-row">
        <article className="metric-card">
          <span className="mc-value">{totals.projects}</span>
          <span className="mc-label">Projects</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totals.hours.toFixed(2)}h</span>
          <span className="mc-label">Total Hours</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totals.tasks}</span>
          <span className="mc-label">Tasks</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totals.completed}</span>
          <span className="mc-label">Completed</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totals.activeUsers}</span>
          <span className="mc-label">Active Users (7d)</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totals.weekHours.toFixed(2)}h</span>
          <span className="mc-label">Hours (Last 7d)</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{hoursDeltaPct >= 0 ? '+' : ''}{hoursDeltaPct.toFixed(1)}%</span>
          <span className="mc-label">7d Growth</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totals.inProgress}</span>
          <span className="mc-label">In Progress Tasks</span>
        </article>
        <article className="metric-card">
          <span className="mc-value">{totals.completedPct.toFixed(1)}%</span>
          <span className="mc-label">% Completed</span>
        </article>
      </div>

      <div className="analytics-grid">
        <div className="card analytics-full">
          <h2>14-Day Team Hours Trend</h2>
          <div className="chart-container chart-260">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="#2f5ef6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card analytics-full">
          <h2>Hours By Project</h2>
          <div className="chart-container chart-260">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projects}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#2f5ef6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Completion Ratio</h2>
          <div className="chart-container chart-260">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={completionData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72}>
                  {completionData.map((item, idx) => (
                    <Cell key={item.name} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Top Members By Hours</h2>
          <div className="chart-container chart-260">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={members.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#11a36a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card analytics-full">
          <h2>Project Performance Details</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Tasks</th>
                  <th>In Progress</th>
                  <th>Completed</th>
                  <th>% Completed</th>
                  <th>Members</th>
                </tr>
              </thead>
              <tbody>
                {projects.length ? (
                  projects.map((project) => (
                    <tr key={project.project}>
                      <td>{project.project}</td>
                      <td>{project.hours.toFixed(2)}h</td>
                      <td>{project.tasks}</td>
                      <td>{project.inProgress}</td>
                      <td>{project.completed}</td>
                      <td>{project.completedPct.toFixed(1)}%</td>
                      <td>{project.members}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>No project data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card analytics-full">
          <h2>Member Performance Details</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Hours</th>
                  <th>Tasks</th>
                  <th>In Progress</th>
                  <th>Completed</th>
                  <th>% Completed</th>
                </tr>
              </thead>
              <tbody>
                {members.length ? (
                  members.map((member, idx) => (
                    <tr key={`${member.name}-${idx}`}>
                      <td>{member.name}</td>
                      <td>{member.hours.toFixed(2)}h</td>
                      <td>{member.tasks}</td>
                      <td>{member.inProgress}</td>
                      <td>{member.completed}</td>
                      <td>{member.completedPct.toFixed(1)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No member data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
