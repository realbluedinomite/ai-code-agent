import { TodoService } from '../services/TodoService';
import { LocalStorageTodoRepository } from '../services/TodoService';
import { TodoList } from './TodoList';
import { validateTodoText } from '../utils/helpers';

export interface TodoAppProps {
  container: HTMLElement;
}

export class TodoApp {
  private container: HTMLElement;
  private todoService: TodoService;
  private todoList: TodoList | null = null;

  constructor(props: TodoAppProps) {
    this.container = props.container;
    const repository = new LocalStorageTodoRepository();
    this.todoService = new TodoService(repository);
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="todo-app">
        <header class="todo-header">
          <h1>Simple Todo App</h1>
          <div class="todo-stats">
            <span class="active-count">0 active</span>
            <span class="completed-count">0 completed</span>
          </div>
        </header>
        
        <form class="todo-form" id="todo-form">
          <input 
            type="text" 
            id="todo-input" 
            placeholder="What needs to be done?"
            aria-label="New todo"
            autocomplete="off"
          />
          <button type="submit" aria-label="Add todo">Add</button>
        </form>

        <div class="todo-filters">
          <button class="filter-btn active" data-filter="all" aria-label="Show all todos">All</button>
          <button class="filter-btn" data-filter="active" aria-label="Show active todos">Active</button>
          <button class="filter-btn" data-filter="completed" aria-label="Show completed todos">Completed</button>
        </div>

        <div class="todo-list-container" id="todo-list-container"></div>

        <div class="todo-footer">
          <button class="clear-completed" id="clear-completed" aria-label="Clear completed todos">
            Clear Completed
          </button>
        </div>
      </div>
    `;

    // Initialize TodoList component
    const listContainer = this.container.querySelector('#todo-list-container') as HTMLElement;
    const initialTodos = this.todoService.getAllTodos();
    this.todoList = new TodoList(listContainer, {
      todos: initialTodos,
      onToggle: (id) => this.handleToggle(id),
      onDelete: (id) => this.handleDelete(id),
      onEdit: (id, text) => this.handleEdit(id, text)
    });

    this.updateStats();
  }

  private bindEvents(): void {
    const form = this.container.querySelector('#todo-form') as HTMLFormElement;
    const input = this.container.querySelector('#todo-input') as HTMLInputElement;
    const clearBtn = this.container.querySelector('#clear-completed') as HTMLButtonElement;
    const filterBtns = this.container.querySelectorAll('.filter-btn');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddTodo(input.value);
    });

    clearBtn.addEventListener('click', () => {
      this.handleClearCompleted();
    });

    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        this.handleFilterChange(target.dataset.filter as string);
      });
    });
  }

  private handleAddTodo(text: string): void {
    const validation = validateTodoText(text);
    if (!validation.isValid) {
      this.showError(validation.error || 'Invalid todo');
      return;
    }

    const todo = this.todoService.createTodo(text);
    this.refreshTodoList();
    this.clearInput();
    this.updateStats();
  }

  private handleToggle(id: string): void {
    this.todoService.toggleTodo(id);
    this.refreshTodoList();
    this.updateStats();
  }

  private handleDelete(id: string): void {
    this.todoService.deleteTodo(id);
    this.refreshTodoList();
    this.updateStats();
  }

  private handleEdit(id: string, text: string): void {
    const validation = validateTodoText(text);
    if (!validation.isValid) {
      this.showError(validation.error || 'Invalid todo');
      return;
    }

    this.todoService.updateTodoText(id, text);
    this.refreshTodoList();
    this.updateStats();
  }

  private handleClearCompleted(): void {
    this.todoService.clearCompleted();
    this.refreshTodoList();
    this.updateStats();
  }

  private handleFilterChange(filter: string): void {
    // Update active filter button
    const filterBtns = this.container.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    const activeBtn = this.container.querySelector(`[data-filter="${filter}"]`) as HTMLElement;
    activeBtn.classList.add('active');

    // Filter and display todos
    let todos = this.todoService.getAllTodos();
    
    switch (filter) {
      case 'active':
        todos = this.todoService.getActiveTodos();
        break;
      case 'completed':
        todos = this.todoService.getCompletedTodos();
        break;
    }

    if (this.todoList) {
      this.todoList.updateTodos(todos);
    }
  }

  private refreshTodoList(): void {
    if (this.todoList) {
      const activeFilter = this.container.querySelector('.filter-btn.active') as HTMLElement;
      const filter = activeFilter?.dataset.filter || 'all';
      this.handleFilterChange(filter);
    }
  }

  private updateStats(): void {
    const activeTodos = this.todoService.getActiveTodos();
    const completedTodos = this.todoService.getCompletedTodos();

    const activeCount = this.container.querySelector('.active-count') as HTMLElement;
    const completedCount = this.container.querySelector('.completed-count') as HTMLElement;

    activeCount.textContent = `${activeTodos.length} active`;
    completedCount.textContent = `${completedTodos.length} completed`;

    const clearBtn = this.container.querySelector('#clear-completed') as HTMLButtonElement;
    clearBtn.style.display = completedTodos.length > 0 ? 'block' : 'none';
  }

  private clearInput(): void {
    const input = this.container.querySelector('#todo-input') as HTMLInputElement;
    input.value = '';
  }

  private showError(message: string): void {
    // Simple error display - in a real app you'd want better UX
    alert(message);
  }
}