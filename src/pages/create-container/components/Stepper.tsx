import { motion } from 'framer-motion';
import { cn } from '../../../shared/utils/cn';

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

const containerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut' as const,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

export function Stepper({ steps, currentStep, completedSteps }: StepperProps) {
  return (
    <motion.div
      className="mb-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <nav aria-label="Progress">
        <ol className="flex items-center justify-center space-x-3">
          {steps.map((step, index) => (
            <motion.li
              key={step.id}
              className="flex items-center"
              variants={itemVariants}
            >
              <motion.div
                className={cn(
                  'relative flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300',
                  {
                    'bg-primary border-primary text-primary-foreground':
                      completedSteps.includes(step.id),
                    'border-primary text-primary bg-primary/10':
                      currentStep === step.id &&
                      !completedSteps.includes(step.id),
                    'border-muted-foreground/30 text-muted-foreground':
                      currentStep !== step.id &&
                      !completedSteps.includes(step.id),
                  },
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {completedSteps.includes(step.id) ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs"
                  >
                    ✓
                  </motion.div>
                ) : (
                  <span className="text-xs font-medium">{step.id}</span>
                )}
              </motion.div>

              {index < steps.length - 1 && (
                <motion.div
                  className={cn(
                    'w-6 h-px mx-1.5 transition-colors duration-300',
                    {
                      'bg-primary': completedSteps.includes(step.id),
                      'bg-muted-foreground/30': !completedSteps.includes(
                        step.id,
                      ),
                    },
                  )}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              )}
            </motion.li>
          ))}
        </ol>
      </nav>
    </motion.div>
  );
}
