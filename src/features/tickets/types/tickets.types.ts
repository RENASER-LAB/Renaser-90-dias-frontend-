export type EstadoTicketMentor = 'OPEN' | 'ANSWERED';

export interface WireTicketMentor {
  id: string;
  traineeProfileId: string;
  blockDescription: string;
  attemptedSolutions: string;
  smartGoalImpact: string;
  status: EstadoTicketMentor;
  mentorAnswer: string | null;
  answeredAt: string | null;
  savedToLibrary: boolean;
  createdAt: string;
  /** Spec 056 FR-030: quién respondió (el mentor o el líder). `null` abierta o respondida antes de que se guardara quién; sin `nombre` si la cuenta ya no existe. */
  respondidoPor?: { id: string; nombre?: string | null } | null;
}

export interface WireTicketsMentorPage {
  tickets: WireTicketMentor[];
  nextCursor: string | null;
}

export interface AbrirTicketMentorPayload {
  blockDescription: string;
  attemptedSolutions: string;
  smartGoalImpact: string;
}
