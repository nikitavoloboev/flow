export interface FormStep {
  id: number;
  title: string;
  description?: string;
}

export const FORM_STEPS: FormStep[] = [
  {
    id: 1,
    title: 'Database Type',
    description: 'Choose your database',
  },
  {
    id: 2,
    title: 'Configuration',
    description: 'Set up your database',
  },
  {
    id: 3,
    title: 'Review',
    description: 'Confirm your settings',
  },
];
