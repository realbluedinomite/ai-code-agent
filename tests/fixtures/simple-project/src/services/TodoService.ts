import { TodoModel, Todo } from '../models/Todo';

export interface TodoRepository {
  getAll(): Todo[];
  getById(id: string): Todo | undefined;
  save(todo: TodoModel): void;
  delete(id: string): void;
  update(id: string, updates: Partial<Todo>): void;
}

export class LocalStorageTodoRepository implements TodoRepository {
  private storageKey = 'simple-todos';

  getAll(): Todo[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      
      const todos = JSON.parse(data);
      return todos.map((todo: any) => TodoModel.fromJSON(todo));
    } catch (error) {
      console.error('Error loading todos from localStorage:', error);
      return [];
    }
  }

  getById(id: string): Todo | undefined {
    const todos = this.getAll();
    return todos.find(todo => todo.id === id);
  }

  save(todo: TodoModel): void {
    const todos = this.getAll();
    const existingIndex = todos.findIndex(t => t.id === todo.id);
    
    if (existingIndex >= 0) {
      todos[existingIndex] = todo.toJSON();
    } else {
      todos.push(todo.toJSON());
    }
    
    this.persist(todos);
  }

  delete(id: string): void {
    const todos = this.getAll();
    const filtered = todos.filter(todo => todo.id !== id);
    this.persist(filtered);
  }

  update(id: string, updates: Partial<Todo>): void {
    const todos = this.getAll();
    const index = todos.findIndex(todo => todo.id === id);
    
    if (index >= 0) {
      todos[index] = { ...todos[index], ...updates };
      this.persist(todos);
    }
  }

  private persist(todos: Todo[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(todos));
    } catch (error) {
      console.error('Error saving todos to localStorage:', error);
    }
  }
}

export class TodoService {
  private repository: TodoRepository;

  constructor(repository: TodoRepository) {
    this.repository = repository;
  }

  createTodo(text: string): TodoModel {
    const todo = new TodoModel(text);
    this.repository.save(todo);
    return todo;
  }

  getAllTodos(): TodoModel[] {
    const todos = this.repository.getAll();
    return todos.map(todo => TodoModel.fromJSON(todo));
  }

  toggleTodo(id: string): void {
    const todo = this.repository.getById(id);
    if (todo) {
      const todoModel = TodoModel.fromJSON(todo);
      todoModel.toggle();
      this.repository.save(todoModel);
    }
  }

  updateTodoText(id: string, text: string): void {
    const todo = this.repository.getById(id);
    if (todo) {
      const todoModel = TodoModel.fromJSON(todo);
      todoModel.updateText(text);
      this.repository.save(todoModel);
    }
  }

  deleteTodo(id: string): void {
    this.repository.delete(id);
  }

  getActiveTodos(): TodoModel[] {
    return this.getAllTodos().filter(todo => !todo.completed);
  }

  getCompletedTodos(): TodoModel[] {
    return this.getAllTodos().filter(todo => todo.completed);
  }

  clearCompleted(): void {
    const completedTodos = this.getCompletedTodos();
    completedTodos.forEach(todo => {
      this.repository.delete(todo.id);
    });
  }
}