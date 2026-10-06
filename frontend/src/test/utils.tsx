import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../contexts/AppContext';
import { ThemeProvider } from '../contexts/ThemeContext';

export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  window.history.pushState({}, '', route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <AppProvider>{ui}</AppProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

export * from '@testing-library/react';
