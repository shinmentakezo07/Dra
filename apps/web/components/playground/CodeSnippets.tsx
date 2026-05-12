"use client";

export interface CodeSnippet {
  id: string;
  name: string;
  language: string;
  code: string;
  description: string;
  category: string;
}

export const codeSnippets: CodeSnippet[] = [
  // JavaScript
  {
    id: "js-hello",
    name: "Hello World",
    language: "javascript",
    code: `console.log("Hello, World!");`,
    description: "Basic Hello World program",
    category: "Basics"
  },
  {
    id: "js-async",
    name: "Async/Await",
    language: "javascript",
    code: `async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  console.log(data);
}

fetchData();`,
    description: "Asynchronous programming with async/await",
    category: "Advanced"
  },
  {
    id: "js-array-methods",
    name: "Array Methods",
    language: "javascript",
    code: `const numbers = [1, 2, 3, 4, 5];

// Map
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);

// Filter
const evens = numbers.filter(n => n % 2 === 0);
console.log("Evens:", evens);

// Reduce
const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log("Sum:", sum);`,
    description: "Common array manipulation methods",
    category: "Data Structures"
  },
  {
    id: "js-classes",
    name: "ES6 Classes",
    language: "javascript",
    code: `class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  
  greet() {
    console.log(\`Hi, I'm \${this.name} and I'm \${this.age} years old.\`);
  }
}

const john = new Person("John", 30);
john.greet();`,
    description: "Object-oriented programming with ES6 classes",
    category: "OOP"
  },
  // Python
  {
    id: "py-hello",
    name: "Hello World",
    language: "python",
    code: `print("Hello, World!")`,
    description: "Basic Hello World program",
    category: "Basics"
  },
  {
    id: "py-list-comp",
    name: "List Comprehension",
    language: "python",
    code: `# List comprehension examples
numbers = [1, 2, 3, 4, 5]

# Square all numbers
squares = [n**2 for n in numbers]
print("Squares:", squares)

# Filter even numbers
evens = [n for n in numbers if n % 2 == 0]
print("Evens:", evens)

# Create dictionary
squares_dict = {n: n**2 for n in numbers}
print("Dictionary:", squares_dict)`,
    description: "Powerful list comprehension techniques",
    category: "Data Structures"
  },
  {
    id: "py-classes",
    name: "Python Classes",
    language: "python",
    code: `class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    def greet(self):
        print(f"Hi, I'm {self.name} and I'm {self.age} years old.")

john = Person("John", 30)
john.greet()`,
    description: "Object-oriented programming in Python",
    category: "OOP"
  },
  {
    id: "py-decorators",
    name: "Decorators",
    language: "python",
    code: `def timer_decorator(func):
    import time
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper

@timer_decorator
def slow_function():
    import time
    time.sleep(0.5)
    print("Function executed!")

slow_function()`,
    description: "Function decorators for code enhancement",
    category: "Advanced"
  },
  // TypeScript
  {
    id: "ts-interfaces",
    name: "TypeScript Interfaces",
    language: "typescript",
    code: `interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
}

function greetUser(user: User): void {
  console.log(\`Hello, \${user.name}!\`);
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com"
};

greetUser(user);`,
    description: "Working with TypeScript interfaces",
    category: "Types"
  },
  {
    id: "ts-generics",
    name: "Generics",
    language: "typescript",
    code: `function identity<T>(arg: T): T {
  return arg;
}

const stringResult = identity<string>("Hello");
const numberResult = identity<number>(42);

console.log(stringResult, numberResult);

// Generic array function
function getFirstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

console.log(getFirstElement([1, 2, 3]));
console.log(getFirstElement(["a", "b", "c"]));`,
    description: "Type-safe generics in TypeScript",
    category: "Advanced"
  },
  // Go
  {
    id: "go-hello",
    name: "Hello World",
    language: "go",
    code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
    description: "Basic Go program",
    category: "Basics"
  },
  {
    id: "go-goroutines",
    name: "Goroutines",
    language: "go",
    code: `package main

import (
    "fmt"
    "time"
)

func worker(id int) {
    fmt.Printf("Worker %d starting\\n", id)
    time.Sleep(time.Second)
    fmt.Printf("Worker %d done\\n", id)
}

func main() {
    for i := 1; i <= 3; i++ {
        go worker(i)
    }
    time.Sleep(2 * time.Second)
}`,
    description: "Concurrent programming with goroutines",
    category: "Concurrency"
  },
  // Rust
  {
    id: "rust-hello",
    name: "Hello World",
    language: "rust",
    code: `fn main() {
    println!("Hello, World!");
}`,
    description: "Basic Rust program",
    category: "Basics"
  },
  {
    id: "rust-ownership",
    name: "Ownership",
    language: "rust",
    code: `fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone(); // Deep copy
    
    println!("s1: {}, s2: {}", s1, s2);
    
    let x = 5;
    let y = x; // Copy for simple types
    println!("x: {}, y: {}", x, y);
}`,
    description: "Understanding Rust's ownership system",
    category: "Memory Management"
  }
];

export function getSnippetsByLanguage(language: string): CodeSnippet[] {
  return codeSnippets.filter(s => s.language === language);
}

export function getSnippetsByCategory(category: string): CodeSnippet[] {
  return codeSnippets.filter(s => s.category === category);
}

export function getAllCategories(): string[] {
  return Array.from(new Set(codeSnippets.map(s => s.category)));
}
