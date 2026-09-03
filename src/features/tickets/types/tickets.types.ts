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
