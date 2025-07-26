<task name="Create New Workflow">

<task_objective>
Guide the user through the process of creating a new standardized workflow file for the consultant-copilot project. The output will be a properly structured workflow file in the prompts/workflows directory following project conventions.
</task_objective>

<detailed_sequence_steps>
# Create New Workflow Process - Detailed Sequence of Steps

## 1. Define Workflow Purpose

1. Use the `ask_followup_question` command to ask the USER for the purpose of the new workflow.
   
2. Use the `ask_followup_question` command to ask the USER for a concise name for the workflow.
   
3. Determine the appropriate filename using kebab-case format (e.g., `analyze-system-requirements.md`).

4. Inform the USER of the upcoming workflow file creation process and the main steps they will be asked to complete.

## 2. Define Task Objective

1. Use the `ask_followup_question` command to ask the USER for the primary objective of the workflow. Remind the user to provide breadcrubs of the inputs to be used, the output to be generated, and a generalization of the processing to formulate the outputs.
   
2. Use the `ask_followup_question` command to ask the USER what tools or services will be required (Firebase Functions, Cloud Run, third-party APIs, etc.).
   
3. Use the `ask_followup_question` command to ask the USER what the expected output format will be (e.g., markdown file, code file, terminal output).
   
4. Formulate a clear, concise task objective statement (1-3 sentences) based on the USER's responses.

## 3. Outline Major Steps

1. Use the `ask_followup_question` command to ask the USER to list the major steps in the workflow (3-7 steps recommended) and they will have an opportunity to provide more details later or let the assistant determine this for them
   
2. For each major step, determine the following:
   - Required tools or resources
   - Expected outputs or transitions to the next step

## 4. Define Detailed Substeps

1. For each major step identified and analyzed, present the user with how you intend to perform the step and use the `ask_followup_question` command to seek confirmation or clarification.

## 5. Generate Workflow File

1. The `prompts/workflows` directory already exists, so proceed to create the file.

2. Create a markdown file named `prompts/workflows/{{workflow-filename}}.md` with the following structure:
   i. Task definition with name attribute
   ii. Task objective section
   iii. Detailed sequence steps section with proper formatting
   iv. Proper tool references and formatting conventions

3. Use the `read_file` command to read any existing workflow files as templates to ensure the new workflow follows project conventions.

4. Use the `write_to_file` command to write the completed workflow file.

5. Present the USER with confirmation of the workflow file creation and its location in the prompts/workflows directory.

</detailed_sequence_steps>

</task>