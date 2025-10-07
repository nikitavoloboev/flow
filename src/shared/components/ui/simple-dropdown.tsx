import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from 'react';

interface SimpleDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

interface SimpleDropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'destructive';
  className?: string;
}

interface DropdownContextType {
  closeDropdown: () => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

export function SimpleDropdown({
  trigger,
  children,
  align = 'right',
}: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <DropdownContext.Provider value={{ closeDropdown }}>
          <div
            className={`
              absolute top-full mt-1 w-40 
              bg-white dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700 
              rounded-md shadow-lg 
              py-1 z-50
              ${align === 'right' ? 'right-0' : 'left-0'}
            `}
          >
            {children}
          </div>
        </DropdownContext.Provider>
      )}
    </div>
  );
}

export function SimpleDropdownItem({
  children,
  onClick,
  variant = 'default',
  className = '',
}: SimpleDropdownItemProps) {
  const context = useContext(DropdownContext);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
        context?.closeDropdown();
      }}
      className={`
        w-full text-left px-3 py-2 text-sm
        hover:bg-gray-100 dark:hover:bg-gray-700
        flex items-center gap-2
        transition-colors duration-150
        ${
          variant === 'destructive'
            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-gray-700 dark:text-gray-200'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
