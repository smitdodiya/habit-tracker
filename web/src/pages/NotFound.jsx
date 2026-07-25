import { useNavigate } from 'react-router-dom';
import { ArrowLeft, House } from '@phosphor-icons/react';

import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { NotFoundIllustration } from '../components/illustrations/Illustrations.jsx';

/** 404 (brief §04, "404 / Empty State"). */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-6">
      <EmptyState
        illustration={NotFoundIllustration}
        title="This page doesn't exist"
        description="The link may be out of date, or the page may have moved. Nothing you've tracked is affected."
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={15} weight="bold" />
              Go back
            </Button>
            <Button onClick={() => navigate('/today')}>
              <House size={15} weight="fill" />
              Back to today
            </Button>
          </div>
        }
      />
    </div>
  );
}
