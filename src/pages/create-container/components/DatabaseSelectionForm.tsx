import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../../../shared/components/ui/button';
import { Form } from '../../../shared/components/ui/form';
import { useContainerCreationWizard } from '../hooks/use-container-creation-wizard';
import { ContainerConfigurationStep } from '../steps/container-configuration-step';
import { DatabaseSelectionStep } from '../steps/database-selection-step';
import { ReviewStep } from '../steps/review-step';
import { FORM_STEPS } from '../types/form-steps';
import { Stepper } from './Stepper';

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut' as const,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 },
  },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
      delay: 0.2,
    },
  },
};

export function DatabaseSelectionForm() {
  const {
    form,
    handleSubmit,
    currentStep,
    completedSteps,
    nextStep,
    previousStep,
    isCurrentStepValid,
    submit,
    cancel,
    isSubmitting,
  } = useContainerCreationWizard();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <DatabaseSelectionStep form={form} isSubmitting={isSubmitting} />
        );
      case 2:
        return (
          <ContainerConfigurationStep form={form} isSubmitting={isSubmitting} />
        );
      case 3:
        return <ReviewStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <motion.div
        className="h-screen flex flex-col"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Fixed Header with Stepper - Más compacto */}
        <motion.div
          className="flex-shrink-0 px-6 pb-2 border-b border-border bg-background"
          variants={contentVariants}
        >
          <Stepper
            steps={FORM_STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </motion.div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full flex items-center justify-center"
            >
              <div className="w-full max-w-md">{renderCurrentStep()}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed Footer with Navigation - Mejor espaciado */}
        <motion.div
          className="flex-shrink-0 px-6 pb-8 pt-4 border-t border-border bg-background"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <div className="flex justify-between items-center">
            {currentStep === 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={cancel}
                disabled={isSubmitting}
                className="px-6 py-2"
              >
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={previousStep}
                disabled={isSubmitting}
                className="px-6 py-2"
              >
                Previous
              </Button>
            )}

            {currentStep < FORM_STEPS.length ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={isSubmitting || !isCurrentStepValid}
                className="px-6 py-2"
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting || !isCurrentStepValid}
                className="px-6 py-2"
                onClick={handleSubmit(submit)}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'linear',
                      }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                    />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </Form>
  );
}
