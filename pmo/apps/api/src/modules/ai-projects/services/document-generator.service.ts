/**
 * Document Generator Service
 *
 * AI-powered generation of project documents including:
 * - Project Charter
 * - Statement of Work (SOW)
 * - Executive Summary
 * - Status Report
 * - Project Closure Report
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';

export type DocumentType =
  | 'PROJECT_CHARTER'
  | 'STATEMENT_OF_WORK'
  | 'EXECUTIVE_SUMMARY'
  | 'STATUS_REPORT'
  | 'CLOSURE_REPORT';

export interface DocumentTemplate {
  type: DocumentType;
  name: string;
  description: string;
  sections: DocumentSection[];
}

export interface DocumentSection {
  id: string;
  title: string;
  required: boolean;
  description?: string;
  placeholder?: string;
}

export interface GeneratedDocument {
  id?: number;
  projectId: number;
  type: DocumentType;
  title: string;
  content: string;
  sections: GeneratedSection[];
  metadata: {
    generatedAt: Date;
    generatedBy: 'AI' | 'TEMPLATE';
    version: number;
    wordCount: number;
  };
}

export interface GeneratedSection {
  id: string;
  title: string;
  content: string;
}

export interface DocumentInput {
  projectName?: string;
  clientName?: string;
  projectDescription?: string;
  objectives?: string[];
  scope?: {
    inScope?: string[];
    outOfScope?: string[];
  };
  timeline?: {
    startDate?: string;
    endDate?: string;
    milestones?: { name: string; date: string }[];
  };
  budget?: number;
  stakeholders?: { name: string; role: string }[];
  customFields?: Record<string, string>;
}

class DocumentGeneratorService {
  private templates: Record<DocumentType, DocumentTemplate> = {
    PROJECT_CHARTER: {
      type: 'PROJECT_CHARTER',
      name: 'Project Charter',
      description: 'High-level document that formally authorizes a project',
      sections: [
        { id: 'purpose', title: 'Project Purpose', required: true },
        { id: 'objectives', title: 'Objectives', required: true },
        { id: 'scope', title: 'Scope', required: true },
        { id: 'stakeholders', title: 'Key Stakeholders', required: true },
        { id: 'timeline', title: 'High-Level Timeline', required: true },
        { id: 'budget', title: 'Budget Summary', required: false },
        { id: 'risks', title: 'Initial Risks', required: false },
        { id: 'success_criteria', title: 'Success Criteria', required: true },
        { id: 'approval', title: 'Approval', required: true },
      ],
    },
    STATEMENT_OF_WORK: {
      type: 'STATEMENT_OF_WORK',
      name: 'Statement of Work',
      description:
        'Detailed document defining project requirements and deliverables',
      sections: [
        { id: 'introduction', title: 'Introduction', required: true },
        { id: 'background', title: 'Background', required: false },
        { id: 'objectives', title: 'Project Objectives', required: true },
        { id: 'scope_work', title: 'Scope of Work', required: true },
        { id: 'deliverables', title: 'Deliverables', required: true },
        {
          id: 'timeline_milestones',
          title: 'Timeline and Milestones',
          required: true,
        },
        { id: 'assumptions', title: 'Assumptions', required: true },
        { id: 'constraints', title: 'Constraints', required: false },
        { id: 'resources', title: 'Resources Required', required: false },
        { id: 'acceptance', title: 'Acceptance Criteria', required: true },
        { id: 'payment', title: 'Payment Terms', required: false },
        { id: 'signatures', title: 'Signatures', required: true },
      ],
    },
    EXECUTIVE_SUMMARY: {
      type: 'EXECUTIVE_SUMMARY',
      name: 'Executive Summary',
      description: 'Concise overview for executive stakeholders',
      sections: [
        { id: 'overview', title: 'Project Overview', required: true },
        { id: 'status', title: 'Current Status', required: true },
        { id: 'highlights', title: 'Key Highlights', required: true },
        { id: 'concerns', title: 'Areas of Concern', required: false },
        { id: 'next_steps', title: 'Next Steps', required: true },
        { id: 'metrics', title: 'Key Metrics', required: true },
      ],
    },
    STATUS_REPORT: {
      type: 'STATUS_REPORT',
      name: 'Status Report',
      description: 'Regular status update document',
      sections: [
        { id: 'summary', title: 'Executive Summary', required: true },
        { id: 'progress', title: 'Progress This Period', required: true },
        { id: 'accomplishments', title: 'Key Accomplishments', required: true },
        { id: 'upcoming', title: 'Upcoming Work', required: true },
        { id: 'risks_issues', title: 'Risks and Issues', required: true },
        { id: 'metrics', title: 'Metrics', required: true },
        { id: 'dependencies', title: 'Dependencies', required: false },
        { id: 'decisions', title: 'Decisions Needed', required: false },
      ],
    },
    CLOSURE_REPORT: {
      type: 'CLOSURE_REPORT',
      name: 'Project Closure Report',
      description: 'Final project summary and lessons learned',
      sections: [
        { id: 'summary', title: 'Project Summary', required: true },
        { id: 'objectives_review', title: 'Objectives Review', required: true },
        {
          id: 'deliverables_review',
          title: 'Deliverables Review',
          required: true,
        },
        { id: 'timeline_review', title: 'Timeline Review', required: true },
        { id: 'budget_review', title: 'Budget Review', required: false },
        { id: 'lessons_learned', title: 'Lessons Learned', required: true },
        { id: 'recommendations', title: 'Recommendations', required: true },
        { id: 'acknowledgments', title: 'Acknowledgments', required: false },
        { id: 'sign_off', title: 'Sign-Off', required: true },
      ],
    },
  };

  /**
   * Get available document templates
   */
  getTemplates(): DocumentTemplate[] {
    return Object.values(this.templates);
  }

  /**
   * Get a specific template
   */
  getTemplate(type: DocumentType): DocumentTemplate {
    return this.templates[type];
  }

  /**
   * Generate a document from project data
   */
  async generateDocument(
    projectId: number,
    tenantId: string,
    type: DocumentType,
    additionalInput?: DocumentInput,
  ): Promise<GeneratedDocument> {
    // Get comprehensive project data
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        owner: { select: { name: true, email: true } },
        account: { select: { name: true } },
        tasks: {
          select: {
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        milestones: {
          select: {
            name: true,
            status: true,
            dueDate: true,
          },
          orderBy: { dueDate: 'asc' },
        },
        members: {
          include: { user: { select: { name: true, email: true } } },
        },
        risks: {
          where: { tenantId },
          select: {
            title: true,
            severity: true,
            status: true,
          },
        },
        statusUpdates: {
          select: { summary: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const template = this.templates[type];
    const input: DocumentInput = {
      projectName: project.name,
      clientName: project.account?.name,
      projectDescription: project.description || undefined,
      timeline: {
        startDate: project.startDate?.toISOString().split('T')[0],
        endDate: project.endDate?.toISOString().split('T')[0],
        milestones: project.milestones.map((m) => ({
          name: m.name,
          date: m.dueDate?.toISOString().split('T')[0] || 'TBD',
        })),
      },
      stakeholders: [
        {
          name: project.owner?.name || 'Project Owner',
          role: 'Project Manager',
        },
        ...project.members.map((m) => ({
          name: m.user.name,
          role: m.role || 'Team Member',
        })),
      ],
      ...additionalInput,
    };

    // Generate sections using AI
    const sections = await this.generateSections(project, template, input);

    // Assemble document
    const content = this.assembleSections(sections, template);

    const document: GeneratedDocument = {
      projectId,
      type,
      title: `${project.name} - ${template.name}`,
      content,
      sections,
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'AI',
        version: 1,
        wordCount: content.split(/\s+/).length,
      },
    };

    // Save to database
    const saved = await this.saveDocument(projectId, tenantId, document);
    document.id = saved.id;

    return document;
  }

  /**
   * Get saved documents for a project
   */
  async getProjectDocuments(
    projectId: number,
    tenantId: string,
  ): Promise<
    {
      id: number;
      type: DocumentType;
      title: string;
      createdAt: Date;
      version: number;
    }[]
  > {
    const docs = await prisma.projectDocument.findMany({
      where: { projectId, tenantId },
      select: {
        id: true,
        type: true,
        title: true,
        version: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => ({
      id: d.id,
      type: d.type as DocumentType,
      title: d.title,
      createdAt: d.createdAt,
      version: d.version,
    }));
  }

  /**
   * Get a specific document
   */
  async getDocument(
    documentId: number,
    tenantId: string,
  ): Promise<GeneratedDocument | null> {
    const doc = await prisma.projectDocument.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!doc) return null;

    return {
      id: doc.id,
      projectId: doc.projectId,
      type: doc.type as DocumentType,
      title: doc.title,
      content: doc.content,
      sections: doc.sections as GeneratedSection[],
      metadata: {
        generatedAt: doc.createdAt,
        generatedBy: doc.generatedBy as 'AI' | 'TEMPLATE',
        version: doc.version,
        wordCount: doc.content.split(/\s+/).length,
      },
    };
  }

  /**
   * Update a document section
   */
  async updateDocumentSection(
    documentId: number,
    tenantId: string,
    sectionId: string,
    content: string,
  ): Promise<GeneratedDocument> {
    const doc = await prisma.projectDocument.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!doc) {
      throw new Error('Document not found');
    }

    const sections = doc.sections as GeneratedSection[];
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);

    if (sectionIndex === -1) {
      throw new Error('Section not found');
    }

    sections[sectionIndex].content = content;

    // Reassemble full content
    const template = this.templates[doc.type as DocumentType];
    const fullContent = this.assembleSections(sections, template);

    const updated = await prisma.projectDocument.update({
      where: { id: documentId },
      data: {
        sections,
        content: fullContent,
        version: doc.version + 1,
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      type: updated.type as DocumentType,
      title: updated.title,
      content: updated.content,
      sections: updated.sections as GeneratedSection[],
      metadata: {
        generatedAt: updated.createdAt,
        generatedBy: updated.generatedBy as 'AI' | 'TEMPLATE',
        version: updated.version,
        wordCount: updated.content.split(/\s+/).length,
      },
    };
  }

  /**
   * Export document to different formats
   */
  async exportDocument(
    documentId: number,
    tenantId: string,
    format: 'markdown' | 'html' | 'text',
  ): Promise<string> {
    const doc = await this.getDocument(documentId, tenantId);

    if (!doc) {
      throw new Error('Document not found');
    }

    switch (format) {
      case 'markdown':
        return this.toMarkdown(doc);
      case 'html':
        return this.toHtml(doc);
      case 'text':
        return this.toPlainText(doc);
      default:
        return doc.content;
    }
  }

  // Private helper methods

  private async generateSections(
    project: {
      name: string;
      description?: string | null;
      status: string;
      healthStatus: string | null;
      startDate: Date | null;
      endDate: Date | null;
      tasks: {
        title: string;
        status: string;
        priority: string;
        dueDate: Date | null;
        completedAt: Date | null;
      }[];
      milestones: { name: string; status: string; dueDate: Date | null }[];
      members: { user: { name: string } }[];
      risks: { title: string; severity: string; status: string }[];
      statusUpdates: { summary: string; createdAt: Date }[];
      account?: { name: string } | null;
      owner?: { name: string } | null;
    },
    template: DocumentTemplate,
    input: DocumentInput,
  ): Promise<GeneratedSection[]> {
    const sections: GeneratedSection[] = [];

    // Try AI generation for all sections
    try {
      const prompt = this.buildGenerationPrompt(project, template, input);
      const response = await llmService.complete(prompt, {
        maxTokens: 3000,
        temperature: 0.4,
      });

      const aiSections = JSON.parse(response.content);

      for (const templateSection of template.sections) {
        const aiSection = aiSections.find(
          (s: { id: string }) => s.id === templateSection.id,
        );
        sections.push({
          id: templateSection.id,
          title: templateSection.title,
          content:
            aiSection?.content ||
            this.getDefaultContent(templateSection, input, project),
        });
      }
    } catch {
      // Fall back to template-based generation
      for (const templateSection of template.sections) {
        sections.push({
          id: templateSection.id,
          title: templateSection.title,
          content: this.getDefaultContent(templateSection, input, project),
        });
      }
    }

    return sections;
  }

  private buildGenerationPrompt(
    project: {
      name: string;
      description?: string | null;
      status: string;
      healthStatus: string | null;
      startDate: Date | null;
      endDate: Date | null;
      tasks: { title: string; status: string; dueDate: Date | null }[];
      milestones: { name: string; status: string; dueDate: Date | null }[];
      members: { user: { name: string } }[];
      risks: { title: string; severity: string; status: string }[];
      statusUpdates: { summary: string }[];
    },
    template: DocumentTemplate,
    input: DocumentInput,
  ): string {
    const completedTasks = project.tasks.filter(
      (t) => t.status === 'DONE',
    ).length;
    const totalTasks = project.tasks.length;

    return `Generate content for a ${template.name} document for this project:

PROJECT DETAILS:
- Name: ${project.name}
- Client: ${input.clientName || 'N/A'}
- Description: ${project.description || 'N/A'}
- Status: ${project.status}
- Health: ${project.healthStatus || 'UNKNOWN'}
- Start Date: ${project.startDate?.toLocaleDateString() || 'TBD'}
- End Date: ${project.endDate?.toLocaleDateString() || 'TBD'}

PROGRESS:
- Tasks: ${completedTasks}/${totalTasks} completed
- Milestones: ${project.milestones.map((m) => `${m.name} (${m.status})`).join(', ') || 'None'}

TEAM:
${project.members.map((m) => `- ${m.user.name}`).join('\n') || 'Not specified'}

RISKS:
${project.risks.map((r) => `- ${r.title} (${r.severity})`).join('\n') || 'None identified'}

RECENT UPDATES:
${project.statusUpdates.map((s) => s.summary).join('\n') || 'None'}

${input.objectives ? `OBJECTIVES:\n${input.objectives.map((o) => `- ${o}`).join('\n')}` : ''}
${input.scope?.inScope ? `IN SCOPE:\n${input.scope.inScope.map((s) => `- ${s}`).join('\n')}` : ''}
${input.scope?.outOfScope ? `OUT OF SCOPE:\n${input.scope.outOfScope.map((s) => `- ${s}`).join('\n')}` : ''}

Generate professional content for each section. Return JSON array:
[
  {
    "id": "section_id",
    "content": "Professional content for this section..."
  }
]

Required sections: ${template.sections.map((s) => s.id).join(', ')}

Guidelines:
- Be professional and concise
- Use bullet points where appropriate
- Include specific details from the project data
- For missing information, use "[To be completed]" placeholder
- Keep each section focused on its purpose`;
  }

  private getDefaultContent(
    section: DocumentSection,
    input: DocumentInput,
    project: { name: string; description?: string | null },
  ): string {
    // Provide default content based on section type
    const defaults: Record<string, string> = {
      purpose: `This project charter establishes ${input.projectName || project.name} as an authorized project.\n\n${project.description || '[Project description to be added]'}`,
      objectives:
        input.objectives?.map((o) => `- ${o}`).join('\n') ||
        '- [Objectives to be defined]',
      scope: `**In Scope:**\n${input.scope?.inScope?.map((s) => `- ${s}`).join('\n') || '- [To be defined]'}\n\n**Out of Scope:**\n${input.scope?.outOfScope?.map((s) => `- ${s}`).join('\n') || '- [To be defined]'}`,
      stakeholders:
        input.stakeholders
          ?.map((s) => `- **${s.name}**: ${s.role}`)
          .join('\n') || '- [Stakeholders to be identified]',
      timeline: `**Start Date:** ${input.timeline?.startDate || 'TBD'}\n**End Date:** ${input.timeline?.endDate || 'TBD'}\n\n**Key Milestones:**\n${input.timeline?.milestones?.map((m) => `- ${m.name}: ${m.date}`).join('\n') || '- [Milestones to be defined]'}`,
      budget: input.budget
        ? `Total Budget: $${input.budget.toLocaleString()}`
        : '[Budget to be determined]',
      risks: '[Initial risks to be identified during project planning]',
      success_criteria: '[Success criteria to be defined with stakeholders]',
      approval:
        '**Approved by:**\n\n_____________________ Date: _________\nProject Sponsor\n\n_____________________ Date: _________\nProject Manager',
      introduction: `This Statement of Work defines the requirements, deliverables, and terms for ${input.projectName || project.name}.`,
      deliverables: '**Deliverables:**\n- [Deliverables to be defined]',
      assumptions: '**Assumptions:**\n- [Assumptions to be documented]',
      acceptance:
        '**Acceptance Criteria:**\n- [Acceptance criteria to be defined]',
      signatures:
        '**Client Signature:**\n\n_____________________ Date: _________\n\n**Provider Signature:**\n\n_____________________ Date: _________',
    };

    return (
      defaults[section.id] ||
      section.placeholder ||
      `[${section.title} content to be added]`
    );
  }

  private assembleSections(
    sections: GeneratedSection[],
    template: DocumentTemplate,
  ): string {
    const lines: string[] = [];

    lines.push(`# ${template.name}`);
    lines.push('');
    lines.push(`*Generated on ${new Date().toLocaleDateString()}*`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const section of sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  private async saveDocument(
    projectId: number,
    tenantId: string,
    document: GeneratedDocument,
  ): Promise<{ id: number }> {
    // Map document type to schema enum
    const templateType = this.mapToTemplateType(document.type);
    const category = this.mapToCategory(document.type);

    // Check for existing document of same type
    const existing = await prisma.projectDocument.findFirst({
      where: { projectId, tenantId, templateType },
      orderBy: { version: 'desc' },
    });

    const version = existing ? existing.version + 1 : 1;

    const created = await prisma.projectDocument.create({
      data: {
        projectId,
        tenantId,
        templateType,
        category,
        name: document.title,
        status: 'DRAFT',
        content: {
          markdown: document.content,
          sections: document.sections,
          metadata: document.metadata,
        },
        version,
      },
    });

    return { id: created.id };
  }

  private mapToTemplateType(
    type: string,
  ):
    | 'PROJECT_PLAN'
    | 'STATUS_REPORT'
    | 'RISK_REGISTER'
    | 'MEETING_NOTES'
    | 'LESSONS_LEARNED' {
    const typeMap: Record<string, string> = {
      PROJECT_CHARTER: 'PROJECT_PLAN',
      STATUS_REPORT: 'STATUS_REPORT',
      RISK_ASSESSMENT: 'RISK_REGISTER',
      MEETING_AGENDA: 'MEETING_NOTES',
      LESSONS_LEARNED: 'LESSONS_LEARNED',
    };
    return (typeMap[type] || 'PROJECT_PLAN') as
      | 'PROJECT_PLAN'
      | 'STATUS_REPORT'
      | 'RISK_REGISTER'
      | 'MEETING_NOTES'
      | 'LESSONS_LEARNED';
  }

  private mapToCategory(
    type: string,
  ): 'PLANNING' | 'EXECUTION' | 'MONITORING' | 'CLOSING' | 'AI_SPECIFIC' {
    const categoryMap: Record<string, string> = {
      PROJECT_CHARTER: 'PLANNING',
      STATUS_REPORT: 'MONITORING',
      RISK_ASSESSMENT: 'MONITORING',
      MEETING_AGENDA: 'EXECUTION',
      LESSONS_LEARNED: 'CLOSING',
    };
    return (categoryMap[type] || 'PLANNING') as
      | 'PLANNING'
      | 'EXECUTION'
      | 'MONITORING'
      | 'CLOSING'
      | 'AI_SPECIFIC';
  }

  private toMarkdown(doc: GeneratedDocument): string {
    // Content is already in markdown format
    return doc.content;
  }

  private toHtml(doc: GeneratedDocument): string {
    // Simple markdown to HTML conversion
    const html = doc.content
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^\*\*(.+)\*\*$/gm, '<strong>$1</strong>')
      .replace(/^\*(.+)\*$/gm, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/---/g, '<hr>');

    // Wrap in basic HTML structure
    return `<!DOCTYPE html>
<html>
<head>
  <title>${doc.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; }
    h2 { color: #444; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  private toPlainText(doc: GeneratedDocument): string {
    return doc.content
      .replace(/^#+ /gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/---/g, '-------------------');
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
