import { render, screen } from '@testing-library/react';
import App from './App';

test('renders travel planner heading', () => {
  render(<App />);
  expect(screen.getByText(/AI 旅行プランナー/)).toBeInTheDocument();
});
