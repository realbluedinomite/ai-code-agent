export interface TodoListProps {
  todos: import('../models/Todo').TodoModel[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

export class TodoList {
  private element: HTMLElement;
  private todos: TodoListProps['todos'];
  private onToggle: TodoListProps['onToggle'];
  private onDelete: TodoListProps['onDelete'];
  private onEdit: TodoListProps['onEdit'];

  constructor(element: HTMLElement, props: TodoListProps) {
    this.element = element;
    this.todos = props.todos;
    this.onToggle = props.onToggle;
    this.onDelete = props.onDelete;
    this.onEdit = props.onEdit;
    this.render();
  }

  updateTodos(todos: TodoListProps['todos']): void {
    this.todos = todos;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';
    
    if (this.todos.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <p>No todos yet. Add one above!</p>
      `;
      this.element.appendChild(emptyState);
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'todo-list';

    this.todos.forEach(todo => {
      const li = this.createTodoElement(todo);
      ul.appendChild(li);
    });

    this.element.appendChild(ul);
  }

  private createTodoElement(todo: import('../models/Todo').TodoModel): HTMLElement {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.dataset.todoId = todo.id;

    li.innerHTML = `
      <div class="todo-content">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.completed ? 'checked' : ''}
          aria-label="Toggle todo"
        />
        <span class="todo-text">${todo.text}</span>
        <time class="todo-date" datetime="${todo.updatedAt.toISOString()}">
          ${new Date(todo.updatedAt).toLocaleDateString()}
        </time>
      </div>
      <div class="todo-actions">
        <button class="edit-btn" aria-label="Edit todo">Edit</button>
        <button class="delete-btn" aria-label="Delete todo">Delete</button>
      </div>
    `;

    // Add event listeners
    const checkbox = li.querySelector('.todo-checkbox') as HTMLInputElement;
    checkbox.addEventListener('change', () => {
      this.onToggle(todo.id);
    });

    const deleteBtn = li.querySelector('.delete-btn') as HTMLButtonElement;
    deleteBtn.addEventListener('click', () => {
      this.onDelete(todo.id);
    });

    const editBtn = li.querySelector('.edit-btn') as HTMLButtonElement;
    editBtn.addEventListener('click', () => {
      this.startEditMode(li, todo);
    });

    return li;
  }

  private startEditMode(li: HTMLElement, todo: import('../models/Todo').TodoModel): void {
    const textSpan = li.querySelector('.todo-text') as HTMLElement;
    const actions = li.querySelector('.todo-actions') as HTMLElement;
    
    // Create edit input
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = todo.text;
    editInput.className = 'edit-input';
    editInput.setAttribute('aria-label', 'Edit todo text');

    // Create save/cancel buttons
    const editActions = document.createElement('div');
    editActions.className = 'edit-actions';
    editActions.innerHTML = `
      <button class="save-btn" aria-label="Save changes">Save</button>
      <button class="cancel-btn" aria-label="Cancel editing">Cancel</button>
    `;

    // Replace content
    textSpan.style.display = 'none';
    actions.style.display = 'none';
    textSpan.parentElement?.insertBefore(editInput, textSpan);
    textSpan.parentElement?.insertBefore(editActions, actions);

    // Focus input
    editInput.focus();
    editInput.select();

    // Event listeners for save/cancel
    const saveBtn = editActions.querySelector('.save-btn') as HTMLButtonElement;
    const cancelBtn = editActions.querySelector('.cancel-btn') as HTMLButtonElement;

    const saveEdit = () => {
      const newText = editInput.value.trim();
      if (newText && newText !== todo.text) {
        this.onEdit(todo.id, newText);
      }
      this.exitEditMode(li, textSpan, actions, editInput, editActions);
    };

    const cancelEdit = () => {
      this.exitEditMode(li, textSpan, actions, editInput, editActions);
    };

    saveBtn.addEventListener('click', saveEdit);
    cancelBtn.addEventListener('click', cancelEdit);

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });

    editInput.addEventListener('blur', () => {
      // Delay to allow button clicks to register
      setTimeout(() => {
        if (document.activeElement !== saveBtn && document.activeElement !== cancelBtn) {
          cancelEdit();
        }
      }, 100);
    });
  }

  private exitEditMode(
    li: HTMLElement, 
    textSpan: HTMLElement, 
    actions: HTMLElement, 
    editInput: HTMLInputElement, 
    editActions: HTMLElement
  ): void {
    textSpan.style.display = '';
    actions.style.display = '';
    editInput.remove();
    editActions.remove();
  }
}